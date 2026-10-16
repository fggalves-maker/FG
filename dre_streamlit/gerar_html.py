"""Gera uma página HTML única com o painel (dados embutidos), para abrir sem instalar nada.

    python gerar_html.py saida.html

A página traz os números da planilha no momento da geração; filtros, corte e períodos
funcionam no navegador com as mesmas regras de config.py. Não publique a saída: ela contém
os dados da empresa.
"""
import json
import sys
from pathlib import Path

import config as cfg
import leitura

MODELO = Path(__file__).with_name("pagina_modelo.html")


def dados() -> dict:
    base, estr = leitura.carregar_base(), leitura.carregar_estrutura()
    base = base[base["cenario"].isin([cfg.CENARIO_26, cfg.CENARIO_25]) & base["mes"].between(1, 12)].copy()
    dims, rotulos = {}, {}
    for campo in cfg.FILTROS.values():
        chave = base[campo].str.casefold()  # o SUMIFS não diferencia maiúsculas
        rotulos[campo] = base.groupby(chave)[campo].first().to_dict()
        base[campo] = chave
        dims[campo] = sorted(rotulos[campo], key=lambda k: (k == "", k))
    g = base.groupby(["cenario", "conta", "mes", *cfg.FILTROS.values()])["valor"].sum().reset_index()
    g = g[g["valor"] != 0]
    fatos = [[0 if r.cenario == cfg.CENARIO_26 else 1, r.conta, int(r.mes),
              *[dims[c].index(getattr(r, c)) for c in cfg.FILTROS.values()], float(r.valor)]
             for r in g.itertuples(index=False)]
    return {
        "arquivo": cfg.ARQUIVO.name,
        "lancamentos": int(len(base)),
        "estrutura": estr[["linha", "tipo", "nivel", "natureza", "cod", "descricao"]].values.tolist(),
        "sinais": leitura.carregar_sinais(),
        "corte": leitura.mes_de_corte(),
        "filtros": [{"rotulo": r, "opcoes": [rotulos[c][k] for k in dims[c]]} for r, c in cfg.FILTROS.items()],
        "fatos": fatos,
        "todos": cfg.TODOS,
        "subtotais": cfg.SUBTOTAIS,
        "regrasDono": cfg.REGRAS_DONO,
        "emBranco": sorted(cfg.LINHAS_EM_BRANCO_SEM_VALOR),
        "basesPercentual": cfg.BASES_PERCENTUAL,
        "meses": cfg.MESES,
        "trimestres": cfg.TRIMESTRES,
        "periodos": cfg.PERIODOS,
        "periodosPadrao": cfg.PERIODOS_PADRAO,
        "kpis": cfg.KPIS,
        "cores": cfg.CORES,
    }


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    json_dados = json.dumps(dados(), ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    Path(sys.argv[1]).write_text(MODELO.read_text(encoding="utf-8").replace("/*DADOS*/null", json_dados), encoding="utf-8")
    print(f"Gerado {sys.argv[1]}")
