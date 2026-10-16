import { normalizar } from './parse'
import type { Cenario, Fato } from './types'

/** Ordem da DRE: contas (N1) e, depois de cada bloco, o subtotal acumulado. */
const ESTRUTURA: ({ n1: string } | { subtotal: string })[] = [
  { n1: 'VENDAS' },
  { n1: 'IMPOSTOS S/VENDA' },
  { n1: 'DEVOLUÇÕES / BONIFICAÇÕES' },
  { subtotal: 'Receita líquida' },
  { n1: 'CPV' },
  { subtotal: 'Lucro bruto' },
  { n1: 'DESPESAS C/VENDAS' },
  { n1: 'DESPESAS OPERACIONAIS' },
  { subtotal: 'EBITDA' },
  { n1: 'DEPRECIAÇÃO/AMORTIZAÇÃO' },
  { subtotal: 'EBIT' },
  { n1: 'RECEITA/DESPESAS FINANCEIRAS' },
  { subtotal: 'LAIR' },
  { n1: 'IRPJ/CSLL' },
  { subtotal: 'Lucro líquido' },
]
export type Subtotal = 'Receita líquida' | 'Lucro bruto' | 'EBITDA' | 'EBIT' | 'LAIR' | 'Lucro líquido'

const ROTULOS: Record<string, string> = {
  VENDAS: 'Receita bruta',
  'IMPOSTOS S/VENDA': '(−) Impostos sobre vendas',
  'DEVOLUCOES / BONIFICACOES': '(−) Devoluções e bonificações',
  CPV: '(−) CPV',
  'DESPESAS C/VENDAS': '(−) Despesas com vendas',
  'DESPESAS OPERACIONAIS': '(−) Despesas operacionais',
  'DEPRECIACAO/AMORTIZACAO': '(−) Depreciação e amortização',
  'RECEITA/DESPESAS FINANCEIRAS': '(±) Resultado financeiro',
  'IRPJ/CSLL': '(−) IRPJ/CSLL',
}
const chaveN1 = (n1: string) => normalizar(n1).toUpperCase()
const POSICAO = new Map(ESTRUTURA.flatMap((e, i) => ('n1' in e ? [[chaveN1(e.n1), i] as const] : [])))
/** N1 fora da estrutura entram antes do IR, como "outros". */
const POSICAO_OUTROS = ESTRUTURA.findIndex((e) => 'n1' in e && e.n1 === 'IRPJ/CSLL') - 0.5

export const rotuloN1 = (n1: string) => ROTULOS[chaveN1(n1)] ?? n1

export interface Par { real: number; comp: number }
const par = (): Par => ({ real: 0, comp: 0 })
const somar = (p: Par, f: Fato, comp: Cenario) => {
  if (f.cenario === 'real') p.real += f.valor
  else if (f.cenario === comp) p.comp += f.valor
}

export interface LinhaDre extends Par {
  id: string
  rotulo: string
  nivel: 0 | 1 | 2
  subtotal?: boolean
  filhos?: LinhaDre[]
}

/** Monta a DRE comparando o Real com o cenário escolhido. Os fatos já devem estar filtrados. */
export function montarDre(fatos: Fato[], comp: Cenario): LinhaDre[] {
  const porN1 = new Map<string, { nome: string; total: Par; n3: Map<string, { total: Par; n4: Map<string, Par> }> }>()
  for (const f of fatos) {
    if (f.cenario !== 'real' && f.cenario !== comp) continue
    const k = chaveN1(f.n1)
    const g = porN1.get(k) ?? { nome: f.n1, total: par(), n3: new Map() }
    porN1.set(k, g)
    const g3 = g.n3.get(f.n3) ?? { total: par(), n4: new Map() }
    g.n3.set(f.n3, g3)
    const p4 = g3.n4.get(f.n4) ?? par()
    g3.n4.set(f.n4, p4)
    for (const p of [g.total, g3.total, p4]) somar(p, f, comp)
  }
  const porMagnitude = (a: Par, b: Par) => Math.abs(b.real) + Math.abs(b.comp) - Math.abs(a.real) - Math.abs(a.comp)
  const contas = [...porN1.entries()].map(([k, g]) => ({
    pos: POSICAO.get(k) ?? POSICAO_OUTROS,
    linha: {
      id: k, rotulo: rotuloN1(g.nome), nivel: 0 as const, ...g.total,
      filhos: [...g.n3.entries()].sort(([, a], [, b]) => porMagnitude(a.total, b.total)).map(([n3, g3]) => ({
        id: `${k}|${n3}`, rotulo: n3, nivel: 1 as const, ...g3.total,
        filhos: [...g3.n4.entries()].sort(([, a], [, b]) => porMagnitude(a, b))
          .map(([n4, p]) => ({ id: `${k}|${n3}|${n4}`, rotulo: n4, nivel: 2 as const, ...p })),
      })),
    } satisfies LinhaDre,
  }))

  const linhas: LinhaDre[] = []
  const acumulado = par()
  const itens = [
    ...contas,
    ...ESTRUTURA.flatMap((e, pos) => ('subtotal' in e ? [{ pos, subtotal: e.subtotal }] : [])),
  ].sort((a, b) => a.pos - b.pos)
  for (const item of itens) {
    if ('linha' in item) {
      acumulado.real += item.linha.real
      acumulado.comp += item.linha.comp
      linhas.push(item.linha)
    } else {
      linhas.push({ id: item.subtotal, rotulo: item.subtotal, nivel: 0, subtotal: true, ...acumulado })
    }
  }
  return linhas
}

export const subtotal = (dre: LinhaDre[], nome: Subtotal): Par =>
  dre.find((l) => l.subtotal && l.rotulo === nome) ?? par()

export interface MesDre { mes: number; real: number | null; comp: number | null }

/** Um subtotal da DRE mês a mês; null nos meses sem lançamentos daquele cenário. */
export function subtotalPorMes(fatos: Fato[], comp: Cenario, nome: Subtotal, meses: number[]): MesDre[] {
  return meses.map((mes) => {
    const doMes = fatos.filter((f) => f.mes === mes)
    const p = subtotal(montarDre(doMes, comp), nome)
    return {
      mes,
      real: doMes.some((f) => f.cenario === 'real') ? p.real : null,
      comp: doMes.some((f) => f.cenario === comp) ? p.comp : null,
    }
  })
}

export interface Desvio extends Par { nome: string; desvio: number }

/** Maiores desvios (Real − comparação) por conta N4. Positivo = favorável. */
export function maioresDesvios(fatos: Fato[], comp: Cenario, n = 10): Desvio[] {
  const mapa = new Map<string, Par>()
  for (const f of fatos) {
    const p = mapa.get(f.n4) ?? par()
    somar(p, f, comp)
    mapa.set(f.n4, p)
  }
  return [...mapa.entries()]
    .map(([nome, p]) => ({ nome, ...p, desvio: p.real - p.comp }))
    .filter((d) => d.desvio)
    .sort((a, b) => Math.abs(b.desvio) - Math.abs(a.desvio))
    .slice(0, n)
}

/** Custos e despesas (CPV, vendas, operacionais) por centro de custo, em valor positivo. */
export function gastosPorCentro(fatos: Fato[], comp: Cenario, n = 12) {
  const GASTOS = new Set(['CPV', 'DESPESAS C/VENDAS', 'DESPESAS OPERACIONAIS'])
  const mapa = new Map<string, Par>()
  for (const f of fatos) {
    if (!GASTOS.has(chaveN1(f.n1))) continue
    const p = mapa.get(f.centroCusto) ?? par()
    somar(p, f, comp)
    mapa.set(f.centroCusto, p)
  }
  return [...mapa.entries()]
    .map(([centro, p]) => ({ centro, real: -p.real, comp: -p.comp }))
    .filter((c) => c.real || c.comp)
    .sort((a, b) => Math.max(b.real, b.comp) - Math.max(a.real, a.comp))
    .slice(0, n)
}

/** Variação relativa; null quando a base é zero. */
export function variacao(atual: number, base: number): number | null {
  return base ? (atual - base) / Math.abs(base) : null
}
