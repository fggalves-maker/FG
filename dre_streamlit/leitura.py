"""Leitura do .xlsb com cache em parquet (a BASE tem ~350 mil linhas)."""
import json
from datetime import date, timedelta
from pathlib import Path

import pandas as pd
from openpyxl.utils import column_index_from_string
from pyxlsb import open_workbook

import config as cfg

col = lambda letra: column_index_from_string(letra) - 1


def assinatura(arquivo: Path) -> dict:
    s = arquivo.stat()
    return {"arquivo": arquivo.name, "mtime": s.st_mtime, "tamanho": s.st_size}


def texto(v) -> str:
    """Código/rótulo como texto: 2655.0 → "2655"; None → ""."""
    if v is None or (isinstance(v, float) and v != v):  # None ou NaN
        return ""
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    return str(v).strip()


def _linhas(arquivo: Path, aba: str, colunas: list[int], primeira: int):
    with open_workbook(str(arquivo)) as wb, wb.get_sheet(aba) as sh:
        for i, linha in enumerate(sh.rows(sparse=False)):
            if i + 1 < primeira:
                continue
            yield [linha[c].v if c < len(linha) else None for c in colunas]


def _ler_base(arquivo: Path) -> pd.DataFrame:
    campos = list(cfg.COLUNAS_BASE)
    idx = [col(cfg.COLUNAS_BASE[c]) for c in campos]
    linhas = [l for l in _linhas(arquivo, cfg.ABA_BASE, idx, cfg.LINHA_CABECALHO_BASE + 1)
              if any(v not in (None, "") for v in l)]
    df = pd.DataFrame(linhas, columns=campos)
    df["valor"] = pd.to_numeric(df["valor"], errors="coerce").fillna(0.0)
    df["mes"] = pd.to_numeric(df["mes"], errors="coerce")
    for c in ["conta", "cc", "dono", "empresa", "desp_nao_op", "cenario"]:
        df[c] = df[c].map(texto)
    df["cenario"] = df["cenario"].str.lower()
    return df


def carregar_base(arquivo: Path = cfg.ARQUIVO) -> pd.DataFrame:
    """Lê a BASE do .xlsb uma vez e guarda em parquet; relê se o arquivo mudar."""
    cfg.PASTA_CACHE.mkdir(exist_ok=True)
    destino = cfg.PASTA_CACHE / f"{arquivo.stem}.base.parquet"
    meta = destino.with_suffix(".json")
    sig = assinatura(arquivo)
    if destino.exists() and meta.exists() and json.loads(meta.read_text()) == sig:
        return pd.read_parquet(destino)
    df = _ler_base(arquivo)
    df.to_parquet(destino, index=False)
    meta.write_text(json.dumps(sig))
    return df


def _tabela(arquivo: Path, aba: str, linha_cabecalho: int) -> pd.DataFrame:
    with open_workbook(str(arquivo)) as wb, wb.get_sheet(aba) as sh:
        linhas = [[c.v for c in l] for l in sh.rows(sparse=False)]
    cab = [texto(c) for c in linhas[linha_cabecalho - 1]]
    corpo = [l + [None] * (len(cab) - len(l)) for l in linhas[linha_cabecalho:]]
    return pd.DataFrame([l[:len(cab)] for l in corpo], columns=cab)


def carregar_estrutura(arquivo: Path = cfg.ARQUIVO) -> pd.DataFrame:
    t = _tabela(arquivo, cfg.ABA_ESTRUTURA, cfg.LINHA_CABECALHO_ESTRUTURA)
    e = t[list(cfg.COLUNAS_ESTRUTURA.values())].copy()
    e.columns = list(cfg.COLUNAS_ESTRUTURA)
    e = e.dropna(subset=["linha", "descricao"])
    e["linha"] = e["linha"].astype(int)
    e = e[e["linha"] <= cfg.LINHA_FINAL]
    e["nivel"] = pd.to_numeric(e["nivel"], errors="coerce").fillna(0).astype(int)
    e["cod"] = e["cod"].map(texto)
    e["tipo"] = e["tipo"].map(texto)
    e["natureza"] = e["natureza"].map(texto).str.upper()
    e["descricao"] = e["descricao"].map(texto)
    return e.sort_values("ordem").reset_index(drop=True)


def carregar_sinais(arquivo: Path = cfg.ARQUIVO) -> dict[str, float]:
    """lista!H:I → {"RECEITA": 1, ...} (chave em maiúsculas, como o VLOOKUP sem caixa)."""
    idx = [col(cfg.COLUNA_LISTA_TIPO), col(cfg.COLUNA_LISTA_SINAL)]
    sinais = {}
    for tipo, sinal in _linhas(arquivo, cfg.ABA_LISTA, idx, 2):
        if texto(tipo) and isinstance(sinal, (int, float)):
            sinais[texto(tipo).upper()] = float(sinal)
    return sinais


def celula(arquivo: Path, aba: str, ref: str):
    letras = "".join(ch for ch in ref if ch.isalpha())
    linha, c = int(ref[len(letras):]), col(letras)
    with open_workbook(str(arquivo)) as wb, wb.get_sheet(aba) as sh:
        for i, l in enumerate(sh.rows(sparse=False)):
            if i + 1 == linha:
                return l[c].v if c < len(l) else None
    return None


def mes_de_corte(arquivo: Path = cfg.ARQUIVO) -> int:
    """Mês de DRE!F492 (data serial do Excel)."""
    v = celula(arquivo, cfg.ABA_DRE, cfg.CELULA_CORTE)
    return (date(1899, 12, 30) + timedelta(days=int(v))).month if isinstance(v, (int, float)) else 13
