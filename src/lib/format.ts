const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const brlCompacto = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL', notation: 'compact', maximumFractionDigits: 1,
})
const pct = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })
const pctSinal = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' })
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export const moeda = (v: number) => brl.format(v)
export const moedaCompacta = (v: number) => (Math.abs(v) >= 1000 ? brlCompacto.format(v) : brl.format(v))
export const percentual = (v: number) => pct.format(v)
export const percentualComSinal = (v: number) => pctSinal.format(v)
/** 3 → "mar" */
export const rotuloMes = (mes: number) => MESES[mes - 1] ?? String(mes)
