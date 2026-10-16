"""Cálculo da DRE Gerencial 2026 — mesmo resultado dos SUMIFS da planilha."""
from dataclasses import dataclass

import numpy as np
import pandas as pd

import config as cfg

ZERO = np.zeros(12)


def filtrar(base: pd.DataFrame, filtros: dict[str, str]) -> pd.DataFrame:
    """Aplica os filtros D7:D10. Como o SUMIFS, a comparação ignora maiúsculas."""
    df = base
    for rotulo, valor in filtros.items():
        if valor and valor.casefold() != cfg.TODOS.casefold():
            campo = cfg.FILTROS[rotulo]
            df = df[df[campo].str.casefold() == valor.casefold()]
    return df


@dataclass
class Resultado:
    """Valores mês a mês (array de 12) por linha da DRE, para 2026 e 2025."""
    r26: dict[int, np.ndarray]
    r25: dict[int, np.ndarray]
    em_branco: set[int]  # linhas que o Excel deixa vazias com o filtro atual


def _por_conta(df: pd.DataFrame, cenario: str) -> dict[str, np.ndarray]:
    d = df[(df["cenario"] == cenario) & df["mes"].between(1, 12)]
    out: dict[str, np.ndarray] = {}
    for (conta, mes), v in d.groupby(["conta", "mes"])["valor"].sum().items():
        out.setdefault(conta, np.zeros(12))[int(mes) - 1] += v
    return out


def calcular(df: pd.DataFrame, estr: pd.DataFrame, dono: str = cfg.TODOS) -> Resultado:
    linhas, tipos = estr["linha"].tolist(), estr["tipo"].tolist()
    niveis, codigos = estr["nivel"].tolist(), estr["cod"].tolist()
    dono_ok = lambda l: any(dono.casefold() == d.casefold() for d in cfg.REGRAS_DONO[l])

    def montar(cenario: str) -> dict[int, np.ndarray]:
        contas = _por_conta(df, cenario)
        v = {l: contas.get(c, ZERO).copy() for l, t, c in zip(linhas, tipos, codigos) if t == "Conta"}
        # Grupo = soma das contas abaixo dele até voltar ao mesmo nível (ou a um subtotal)
        for i, l in enumerate(linhas):
            if tipos[i] != "Grupo":
                continue
            tot, j = np.zeros(12), i + 1
            while j < len(linhas) and niveis[j] > niveis[i] and tipos[j] != "Subtotal":
                if tipos[j] == "Conta":
                    tot += v[linhas[j]]
                j += 1
            v[l] = tot
        for l in sorted(set(cfg.REGRAS_DONO) - set(cfg.SUBTOTAIS)):
            if l in v and not dono_ok(l):
                v[l] = np.zeros(12)
        for l in sorted(cfg.SUBTOTAIS):
            v[l] = sum((v.get(x, ZERO) for x in cfg.SUBTOTAIS[l]), np.zeros(12))
            if l in cfg.REGRAS_DONO and not dono_ok(l):
                v[l] = np.zeros(12)
        return v

    em_branco = {l for l in cfg.LINHAS_EM_BRANCO_SEM_VALOR if not dono_ok(l)}
    return Resultado(montar(cfg.CENARIO_26), montar(cfg.CENARIO_25), em_branco)


def linha_base(linha: int) -> int:
    """Linha usada no % vertical (VENDAS, ROB ou ROL)."""
    base = cfg.BASES_PERCENTUAL[0][1]
    for a_partir_de, b in cfg.BASES_PERCENTUAL:
        if linha >= a_partir_de:
            base = b
    return base


def periodo(a26: np.ndarray, a25: np.ndarray, nome: str, corte: int) -> tuple[float, float]:
    """(valor da coluna R 2026 / R26+R25, valor da coluna R 2025) de um período."""
    if nome in cfg.MESES:
        i = cfg.MESES.index(nome)
        return a26[i], a25[i]
    if nome in cfg.TRIMESTRES:
        idx = [m - 1 for m in cfg.TRIMESTRES[nome]]
        return a26[idx].sum(), a25[idx].sum()
    antes = slice(0, corte - 1)
    if nome == "ACUMULADO":
        return a26[antes].sum(), a25[antes].sum()
    if nome == "TOTAL":  # R26 até o corte + R25 do restante, contra R25 do ano todo
        return a26[antes].sum() + a25[corte - 1:].sum(), a25.sum()
    raise ValueError(nome)


div = lambda a, b: a / b if b else 0.0


@dataclass
class Celulas:
    r26: float
    p26: float
    r25: float
    p25: float
    delta: float
    pdelta: float


def celulas(res: Resultado, linha: int, natureza: str, nome: str, corte: int,
            sinais: dict[str, float]) -> Celulas:
    v26, v25 = periodo(res.r26[linha], res.r25[linha], nome, corte)
    b = linha_base(linha)
    b26, b25 = periodo(res.r26[b], res.r25[b], nome, corte)
    delta = (v26 - v25) * sinais.get(natureza, 0.0)
    return Celulas(v26, div(v26, b26), v25, div(v25, b25), delta, div(delta, abs(v25)))
