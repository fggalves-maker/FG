"""Painel DRE Gerencial 2026 — réplica da aba "DRE Gerencial 2026".

    pip install -r requirements.txt
    streamlit run app.py
"""
import html

import streamlit as st

import config as cfg
import dre
import leitura

st.set_page_config(page_title="DRE Gerencial 2026", layout="wide")


@st.cache_data(show_spinner="Lendo a BASE_RL_ORÇ (a primeira leitura leva ~1 min; depois usa o cache)…")
def dados(assinatura: dict):
    return (leitura.carregar_base(), leitura.carregar_estrutura(),
            leitura.carregar_sinais(), leitura.mes_de_corte())


def numero(x: float) -> str:
    return f"{round(x) + 0:,.0f}".replace(",", ".")  # + 0 evita "-0"


def pct(x: float) -> str:
    return f"{x * 100:,.1f}%".replace(",", "X").replace(".", ",").replace("X", ".")


def tabela(estr, res, periodos, corte, sinais) -> str:
    c = cfg.CORES
    css = f"""<style>
    .dre {{border-collapse:collapse;font-family:Calibri,Arial,sans-serif;font-size:13px;white-space:nowrap}}
    .dre th {{background:{c['cabecalho']};color:#000;padding:4px 8px;position:sticky;top:0;z-index:1;text-align:center}}
    .dre tr.h2 th {{top:26px}}
    .dre td {{padding:2px 8px;text-align:right;color:#000;background:#fff;font-variant-numeric:tabular-nums}}
    .dre td.d {{text-align:left;position:sticky;left:0;z-index:0}}
    .dre tr.g td {{font-weight:bold}}
    .dre tr.s td {{font-weight:bold;border-top:1px solid {c['borda']};background:{c['subtotal']}}}
    .dre td.neg {{color:{c['negativo']}}}
    .dre td.pct {{color:{c['percentual']}}}
    .dre td.sep {{border-left:1px solid {c['borda']}}}
    </style>"""
    h1 = "<tr><th></th><th>DRE - GERENCIAL</th>" + "".join(
        f"<th colspan=6 class=sep>{html.escape(p)}</th>" for p in periodos) + "</tr>"
    h2 = "<tr class=h2><th></th><th></th>" + "".join(
        f"<th>{'R26+R25' if p == 'TOTAL' else 'R 2026'}</th><th>%</th><th>R 2025</th><th>%</th><th>Δ 25</th><th>% 25</th>"
        for p in periodos) + "</tr>"
    corpo = []
    for _, r in estr.iterrows():
        cls = {"Subtotal": "s", "Grupo": "g"}.get(r.tipo, "")
        recuo = "&nbsp;" * 3 * max(r.nivel - 1, 0)
        tds = [f"<td>{html.escape(r.cod)}</td><td class=d>{recuo}{html.escape(r.descricao)}</td>"]
        for p in periodos:
            if r.linha in res.em_branco:
                tds.append("<td class=sep></td>" + "<td></td>" * 5)
                continue
            v = dre.celulas(res, r.linha, r.natureza, p, corte, sinais)
            pares = [(v.r26, v.p26), (v.r25, v.p25), (v.delta, v.pdelta)]
            for i, (val, pc) in enumerate(pares):
                sep = " sep" if i == 0 else ""
                tds.append(f"<td class='{'neg' if round(val) < 0 else ''}{sep}'>{numero(val)}</td>"
                           f"<td class=pct>{pct(pc)}</td>")
        corpo.append(f"<tr class='{cls}'>{''.join(tds)}</tr>")
    return (css + "<div style='overflow:auto;max-height:75vh'><table class=dre>"
            + h1 + h2 + "".join(corpo) + "</table></div>")


if not cfg.ARQUIVO.exists():
    st.error(f"Arquivo não encontrado: {cfg.ARQUIVO}. Coloque o .xlsb nesta pasta ou defina DRE_ARQUIVO.")
    st.stop()

base, estr, sinais, corte_planilha = dados(leitura.assinatura(cfg.ARQUIVO))

st.title("DRE Gerencial 2026")
st.caption(f"Fonte: {cfg.ARQUIVO.name} · {len(base):,} lançamentos na BASE_RL_ORÇ".replace(",", "."))

with st.sidebar:
    st.header("Filtros")

    def opcoes(campo):
        vistos = {}
        for v in base[campo].unique():
            if v:
                vistos.setdefault(v.casefold(), v)  # SUMIFS não diferencia maiúsculas
        return [cfg.TODOS] + sorted(vistos.values(), key=str.casefold)

    filtros = {rotulo: st.selectbox(rotulo, opcoes(campo)) for rotulo, campo in cfg.FILTROS.items()}
    corte = st.selectbox(
        "Mês de corte (acumulado até o mês anterior)", list(range(1, 14)),
        index=corte_planilha - 1,
        format_func=lambda m: cfg.MESES[m - 1].title() if m <= 12 else "Ano todo",
        help=f"Padrão vem da planilha ({cfg.ABA_DRE}!{cfg.CELULA_CORTE}).",
    )
    periodos = st.multiselect("Períodos", cfg.PERIODOS, default=cfg.PERIODOS_PADRAO)

res = dre.calcular(dre.filtrar(base, filtros), estr, filtros["DONO"])
p_kpi = periodos[-1] if periodos else "ACUMULADO"
for col, (rotulo, linha) in zip(st.columns(len(cfg.KPIS)), cfg.KPIS):
    v26, v25 = dre.periodo(res.r26[linha], res.r25[linha], p_kpi, corte)
    col.metric(f"{rotulo} · {p_kpi}", numero(v26), f"{pct(dre.div(v26 - v25, abs(v25)))} vs 2025")

if periodos:
    st.markdown(tabela(estr, res, periodos, corte, sinais), unsafe_allow_html=True)
else:
    st.info("Escolha ao menos um período na barra lateral.")
