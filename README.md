# FG · Dashboard Financeiro

Dashboard financeiro empresarial que roda 100% no navegador: importe uma planilha
(CSV ou Excel) com seus lançamentos e veja indicadores, gráficos e a lista de
lançamentos. Nenhum dado sai do seu computador.

## O que mostra

- **Indicadores:** resultado, receitas, despesas, margem, contas a receber e a pagar
  (com variação vs. mês anterior quando um único mês está selecionado)
- **Receitas e despesas por mês**
- **Fluxo de caixa acumulado**
- **Despesas por categoria**
- **Tabela de lançamentos** com filtro por tipo
- Filtro de período (de/até), tema claro e escuro automático, layout para celular

## Como rodar

Requer Node.js 20+.

```bash
npm install
npm run dev        # abre em http://localhost:5173
npm test           # testes da importação e dos cálculos
npm run build      # gera a versão de produção em dist/
```

A pasta `dist/` é estática: pode ser publicada no GitHub Pages, Netlify, Vercel etc.

## Formato da planilha

Primeira linha = cabeçalho. Ordem das colunas não importa; acentos e maiúsculas são ignorados.

| Coluna | Obrigatória | Aceita |
|---|---|---|
| `data` | sim | `dd/mm/aaaa`, `aaaa-mm-dd` ou data do Excel |
| `valor` | sim | `1.234,56`, `1234.56`, `R$ 1.234,56`, `-500,00`, `(500,00)` |
| `tipo` | não | `receita`/`entrada`/`crédito` ou `despesa`/`saída`/`débito`. Sem a coluna, valor negativo = despesa |
| `descricao` | não | texto livre (também aceita `histórico`) |
| `categoria` | não | texto livre (também aceita `conta`, `plano de contas`) |
| `status` | não | `pago` (padrão) ou `pendente`/`em aberto`/`a pagar`/`a receber` |

CSV pode usar `;` ou `,` como separador. Veja um exemplo completo em
[`public/exemplo.csv`](public/exemplo.csv).

Linhas com data ou valor inválidos são ignoradas e listadas num aviso no topo.

## Estrutura

```
src/
  App.tsx                     tela principal, filtros e importação
  components/                 cartões de indicador, gráficos, tabela
  lib/parse.ts                leitura de CSV/XLSX e normalização dos lançamentos
  lib/aggregate.ts            cálculos (por mês, KPIs, por categoria)
  lib/format.ts               formatação pt-BR (moeda, %, meses)
public/exemplo.csv            dados de exemplo carregados ao abrir
```

Tecnologias: React + TypeScript + Vite, gráficos com Recharts, CSV com PapaParse,
Excel com read-excel-file, testes com Vitest.
