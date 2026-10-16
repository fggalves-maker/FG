"""Regras da DRE Gerencial 2026 — tudo o que espelha a planilha fica aqui.

Os números de linha são os da aba "DRE Gerencial 2026". Nenhum valor monetário é
digitado no código: contas vêm da aba "Estrutura Máscara DRE", sinais da aba "lista"
e a data de corte da própria aba da DRE.
"""
import os
from pathlib import Path

PASTA = Path(__file__).resolve().parent
PADRAO_ARQUIVO = "DRE Gerencial 2026*.xlsb"  # qualquer versão: v7.9, v7.10_otimizado…


def _achar_arquivo() -> Path:
    """DRE_ARQUIVO, se definido; senão a versão mais recente da DRE nesta pasta."""
    if os.environ.get("DRE_ARQUIVO"):
        return Path(os.environ["DRE_ARQUIVO"])
    versoes = sorted(PASTA.glob(PADRAO_ARQUIVO), key=lambda p: p.stat().st_mtime)
    return versoes[-1] if versoes else PASTA / "DRE Gerencial 2026_v7.9.xlsb"


ARQUIVO = _achar_arquivo()
PASTA_CACHE = PASTA / ".cache"

# ---- BASE_RL_ORÇ (cabeçalho na linha 2) ----
ABA_BASE = "BASE_RL_ORÇ"
LINHA_CABECALHO_BASE = 2
COLUNAS_BASE = {  # campo -> coluna do Excel
    "valor": "E",        # Movimento
    "mes": "F",          # Mês
    "conta": "K",        # para_Conta
    "cc": "N",           # Descrição C.C
    "dono": "O",         # Dono C.C
    "empresa": "P",      # Empresa
    "desp_nao_op": "AL",  # DESPESA NÃO OPERACIONAL
    "cenario": "AM",     # Real / Orçado
}
CENARIO_26 = "real"       # SUMIFS não diferencia maiúsculas: "Real" casa com "real"
CENARIO_25 = "real 2025"

# ---- Estrutura Máscara DRE (cabeçalho na linha 4) ----
ABA_ESTRUTURA = "Estrutura Máscara DRE"
LINHA_CABECALHO_ESTRUTURA = 4
COLUNAS_ESTRUTURA = {  # campo -> título da coluna
    "ordem": "Ordem", "linha": "Linha DRE 2026", "tipo": "Tipo", "nivel": "Nível",
    "natureza": "Natureza", "cod": "Cód. Conta", "descricao": "Descrição",
}
LINHA_FINAL = 252  # LUCRO LÍQUIDO GERENCIAL; 253+ é informativo/contábil

# ---- lista!H:I: sinal do Δ por natureza (sem natureza → 0, como o IFERROR do Excel) ----
ABA_LISTA = "lista"
COLUNA_LISTA_TIPO, COLUNA_LISTA_SINAL = "H", "I"

# ---- Aba da DRE: filtros, corte e conciliação ----
ABA_DRE = "DRE Gerencial 2026"
CELULA_CORTE = "F492"  # "Data de corte do acumulado (1º dia do mês corrente)"
TODOS = "TODOS"
FILTROS = {  # rótulo (como em C7:C10) -> campo da base
    "EMPRESA": "empresa", "DONO": "dono", "C.CUSTO": "cc", "DESP. NÃO OP": "desp_nao_op",
}

# Subtotais: linha -> linhas somadas (fórmulas F16, F51, F131, F215, F221, F244, F250, F252)
SUBTOTAIS = {
    16: [13, 17, 22],      # ROB = VENDAS + BONIFICAÇÕES + DEVOLUÇÕES
    51: [16, 26, 42],      # ROL = ROB + IMPOSTOS S/VENDA + DESPESAS C/VENDAS
    131: [51, 53],         # MARGEM DE CONTRIBUIÇÃO = ROL + CPV
    215: [131, 133],       # RESULTADO OPERACIONAL = MC + DESPESAS OPERACIONAIS
    221: [215, 217],       # EBTDA = RO + DEPRECIAÇÃO/AMORTIZAÇÃO
    244: [221, 223],       # LAIR = EBTDA + RECEITA/DESPESAS FINANCEIRAS
    250: [244, 246],       # LL sem contingência = LAIR + IRPJ/CSLL
    252: [250, 251],       # LL GERENCIAL = LL sem contingência + Provisão de Contingência
}

# Linhas que só têm valor para alguns Donos (F217, F223, F246, F250). Fora da lista: zero.
REGRAS_DONO = {
    217: [TODOS, "Fernando Chable", "Gislaine Coradini"],
    223: [TODOS, "Liliane Peixoto", "Vania Viegas", "Gislaine Coradini"],
    246: [TODOS],
    250: [TODOS],
}
LINHAS_EM_BRANCO_SEM_VALOR = {246}  # F246 devolve "" (em branco), não 0

# % vertical: a partir da linha X, divide pela linha Y (G13, G16, G53)
BASES_PERCENTUAL = [(13, 13), (16, 16), (53, 51)]

MESES = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO",
         "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"]
TRIMESTRES = {"1 TRI": [1, 2, 3], "2 TRI": [4, 5, 6], "3 TRI": [7, 8, 9], "4 TRI": [10, 11, 12]}
PERIODOS = (MESES[:3] + ["1 TRI"] + MESES[3:6] + ["2 TRI"] + MESES[6:9] + ["3 TRI"]
            + MESES[9:] + ["4 TRI", "ACUMULADO", "TOTAL"])
PERIODOS_PADRAO = ["JANEIRO", "FEVEREIRO", "MARÇO", "1 TRI", "ACUMULADO"]

KPIS = [("ROB", 16), ("ROL", 51), ("Margem Contrib.", 131), ("EBTDA", 221), ("LL Gerencial", 252)]

# Critério de aceite 1: linhas e meses conciliados com a planilha (filtros TODOS)
CONCILIACAO_LINHAS = {"VENDAS": 13, "ROB": 16, "ROL": 51, "CPV": 53, "MC": 131,
                      "RO": 215, "EBTDA": 221, "LL GERENCIAL": 252}
CONCILIACAO_MESES = [1, 2, 3]
# Colunas da DRE: a linha 10 tem o nome do período na 1ª coluna de cada bloco
# (R26, %, R25, %, -, Δ, %Δ); os blocos não têm largura fixa, por isso o teste lê o cabeçalho.
LINHA_PERIODOS_DRE = 10
DESLOCAMENTO = {"r26": 0, "p26": 1, "r25": 2, "p25": 3, "delta": 5, "pdelta": 6}

# Visual (igual ao Excel)
CORES = {"cabecalho": "#FCE4D6", "negativo": "#FF0000", "percentual": "#4A90E2",
         "subtotal": "#F2F2F2", "borda": "#999999"}
