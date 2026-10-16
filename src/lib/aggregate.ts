import type { Lancamento } from './types'

export interface Mes {
  chave: string // aaaa-mm
  receitas: number
  despesas: number
  resultado: number
  saldoAcumulado: number
}

export interface Kpis {
  receitas: number
  despesas: number
  resultado: number
  /** Resultado / receitas, ou null sem receitas. */
  margem: number | null
  aReceber: number
  aPagar: number
}

export const chaveMes = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

export function porMes(lancamentos: Lancamento[]): Mes[] {
  const mapa = new Map<string, { receitas: number; despesas: number }>()
  for (const l of lancamentos) {
    const m = mapa.get(chaveMes(l.data)) ?? { receitas: 0, despesas: 0 }
    if (l.tipo === 'receita') m.receitas += l.valor
    else m.despesas += l.valor
    mapa.set(chaveMes(l.data), m)
  }
  let saldo = 0
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, { receitas, despesas }]) => {
      saldo += receitas - despesas
      return { chave, receitas, despesas, resultado: receitas - despesas, saldoAcumulado: saldo }
    })
}

export function kpis(lancamentos: Lancamento[]): Kpis {
  let receitas = 0, despesas = 0, aReceber = 0, aPagar = 0
  for (const l of lancamentos) {
    if (l.tipo === 'receita') {
      receitas += l.valor
      if (l.status === 'pendente') aReceber += l.valor
    } else {
      despesas += l.valor
      if (l.status === 'pendente') aPagar += l.valor
    }
  }
  const resultado = receitas - despesas
  return { receitas, despesas, resultado, margem: receitas ? resultado / receitas : null, aReceber, aPagar }
}

export function despesasPorCategoria(lancamentos: Lancamento[]) {
  const mapa = new Map<string, number>()
  for (const l of lancamentos) {
    if (l.tipo === 'despesa') mapa.set(l.categoria, (mapa.get(l.categoria) ?? 0) + l.valor)
  }
  return [...mapa.entries()].map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor)
}

/** Variação relativa; null quando a base é zero. */
export function variacao(atual: number, anterior: number): number | null {
  return anterior ? (atual - anterior) / Math.abs(anterior) : null
}
