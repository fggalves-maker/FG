# FG · Dashboard Financeiro

Painel de resultado Real × Orçado que roda 100% no navegador: carregue a base da DRE
gerencial e veja indicadores, DRE e desvios. Nenhum dado sai do seu computador.

## O que mostra

Painel **Real × Orçado** feito para a base `BASE_RL_ORÇ.xlsx` (DRE gerencial com níveis N1–N5,
centros de custo e cenários Real, orçado, Forecast e Real do ano anterior).

- **Indicadores:** receita líquida, lucro bruto, EBITDA e lucro líquido, com desvio vs. o cenário
  de comparação e margem sobre a receita líquida
- **Receita líquida e EBITDA por mês:** barras do Real e linha da comparação
- **DRE gerencial** em cascata (receita bruta → receita líquida → lucro bruto → EBITDA → EBIT →
  LAIR → lucro líquido), com abertura por N3 e N4
- **Maiores desvios por conta (N4)** e **custos e despesas por centro de custo**
- Filtros: cenário de comparação (Orçado, Forecast ou Ano anterior), meses, empresa e centro de custo
- Tema claro e escuro automático, layout para celular

Linhas com `N1 = 0` (ajustes gerenciais e contrapartidas patrimoniais) ficam fora da DRE; o painel
informa quantas foram ignoradas.

## DRE Gerencial 2026 (Streamlit)

A pasta [`dre_streamlit/`](dre_streamlit/) tem um painel em Python que reproduz a aba
*DRE Gerencial 2026* da planilha `.xlsb`, com teste de conciliação. Veja o README de lá.

## Como rodar

Requer Node.js 20+.

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # testes da importação e da DRE
npm run build      # gera a versão de produção em dist/
```

A pasta `dist/` é estática: pode ser publicada no GitHub Pages, Netlify, Vercel etc.

## Usando a base real

A base completa tem centenas de milhares de lançamentos (o `.xlsx` tem ~65 MB), pesada demais para
abrir no navegador. Primeiro resuma com o script (requer Python 3 e `openpyxl`):

```bash
pip install openpyxl
python scripts/preparar_base.py BASE_RL_ORÇ.xlsx public/base.csv
```

O resultado (~1 MB) soma o `Movimento` por cenário, mês, empresa, centro de custo, dono e N1–N4.
Com `public/base.csv` presente, `npm run dev` abre direto nele; também dá para escolher o arquivo
pelo botão **Importar base**. `public/base*.csv` e `*.xlsx` estão no `.gitignore` para os dados da
empresa não irem para o repositório (que é público). Sem a base, o painel abre com dados fictícios
de [`public/exemplo.csv`](public/exemplo.csv).

### Colunas usadas

Os nomes são os da base original (acentos e maiúsculas são ignorados); o cabeçalho pode estar em
qualquer uma das 20 primeiras linhas.

| Coluna | Uso |
|---|---|
| `Real / Orçado` | cenário: `Real`, `orçado`, `Forecast`, `Real 2025` (= ano anterior) |
| `Mês` | 1–12 (sem ela, usa o mês de `Data`) |
| `Movimento` | valor com sinal: receitas positivas, custos e despesas negativos |
| `N1` … `N4` | plano gerencial; N1 define a linha da DRE |
| `Empresa`, `Descrição C.C`, `Dono C.C` | filtros e gráfico por centro de custo |

Grafias diferentes da mesma empresa (`Conectar`/`CONECTAR`) são unificadas.

## Estrutura

```
src/
  App.tsx                     tela principal, filtros e importação
  components/                 cartões de indicador, gráficos, tabela da DRE
  lib/parse.ts                leitura de CSV/XLSX e normalização da base
  lib/dre.ts                  DRE em cascata, séries mensais, desvios, centros de custo
  lib/format.ts               formatação pt-BR (moeda, %, meses)
scripts/preparar_base.py      resume o BASE_RL_ORÇ.xlsx em public/base.csv
public/exemplo.csv            dados fictícios carregados quando não há base
```

Tecnologias: React + TypeScript + Vite, gráficos com Recharts, CSV com PapaParse,
Excel com read-excel-file, testes com Vitest.
