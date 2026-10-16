import { describe, expect, it } from 'vitest'
import { linhasParaLancamentos, parseData, parseValor } from './parse'
import { kpis, porMes } from './aggregate'

describe('parseValor', () => {
  it.each([
    ['1.234,56', 1234.56], ['1234.56', 1234.56], ['R$ 1.234,56', 1234.56],
    ['-500,00', -500], ['(1.000,00)', -1000], ['1,234.50', 1234.5], [42, 42],
  ])('%s → %s', (entrada, esperado) => expect(parseValor(entrada)).toBeCloseTo(esperado))
  it('rejeita texto', () => expect(parseValor('abc')).toBeNull())
})

describe('parseData', () => {
  it('dd/mm/aaaa', () => expect(parseData('05/03/2026')).toEqual(new Date(2026, 2, 5)))
  it('aaaa-mm-dd', () => expect(parseData('2026-03-05')).toEqual(new Date(2026, 2, 5)))
  it('rejeita data impossível', () => expect(parseData('31/02/2026')).toBeNull())
})

describe('linhasParaLancamentos', () => {
  it('reconhece cabeçalhos com acento e infere tipo pelo sinal', () => {
    const { lancamentos, erros } = linhasParaLancamentos([
      ['Data', 'Descrição', 'Categoria', 'Valor'],
      ['01/01/2026', 'Venda', 'Vendas', '1.000,00'],
      ['02/01/2026', 'Aluguel', 'Ocupação', '-400,00'],
      ['xx', 'Ruim', '', '1'],
    ])
    expect(erros).toHaveLength(1)
    expect(lancamentos.map((l) => [l.tipo, l.valor])).toEqual([['receita', 1000], ['despesa', 400]])
  })

  it('exige colunas de data e valor', () => {
    expect(linhasParaLancamentos([['descricao'], ['x']]).erros[0]).toMatch(/data, valor/)
  })
})

describe('agregação', () => {
  const { lancamentos } = linhasParaLancamentos([
    ['data', 'tipo', 'valor', 'status'],
    ['10/01/2026', 'receita', '1000', 'pago'],
    ['15/01/2026', 'despesa', '300', 'pendente'],
    ['10/02/2026', 'receita', '500', 'pendente'],
    ['20/02/2026', 'despesa', '700', 'pago'],
  ])
  it('agrupa por mês com saldo acumulado', () => {
    expect(porMes(lancamentos).map((m) => [m.chave, m.resultado, m.saldoAcumulado]))
      .toEqual([['2026-01', 700, 700], ['2026-02', -200, 500]])
  })
  it('calcula KPIs', () => {
    expect(kpis(lancamentos)).toEqual({ receitas: 1500, despesas: 1000, resultado: 500, margem: 1 / 3, aReceber: 500, aPagar: 300 })
  })
})
