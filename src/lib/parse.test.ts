import { describe, expect, it } from 'vitest'
import { linhasParaFatos, parseCenario, parseValor } from './parse'
import { maioresDesvios, montarDre, subtotal, subtotalPorMes } from './dre'

describe('parseValor', () => {
  it.each([
    ['1.234,56', 1234.56], ['1234.56', 1234.56], ['R$ 1.234,56', 1234.56],
    ['-500,00', -500], ['(1.000,00)', -1000], ['1,234.50', 1234.5], [42, 42],
  ])('%s → %s', (entrada, esperado) => expect(parseValor(entrada)).toBeCloseTo(esperado))
  it('rejeita texto', () => expect(parseValor('abc')).toBeNull())
})

describe('parseCenario', () => {
  it.each([
    ['Real', 'real'], ['orçado', 'orcado'], ['Forecast', 'forecast'], ['forecast', 'forecast'], ['Real 2025', 'anterior'],
  ])('%s → %s', (entrada, esperado) => expect(parseCenario(entrada)).toBe(esperado))
  it('rejeita desconhecido', () => expect(parseCenario('xyz')).toBeNull())
})

const CAB = ['Real / Orçado', 'Mês', 'Data', 'Empresa', 'Descrição C.C', 'Dono C.C', 'N1', 'N2', 'N3', 'N4', 'Movimento']

describe('linhasParaFatos', () => {
  it('acha o cabeçalho abaixo da 1ª linha, ignora N1 = 0 e padroniza empresa', () => {
    const r = linhasParaFatos([
      ['◄ Voltar para CAPA', null, null, null, 123],
      CAB,
      ['Real', 2, null, 'Stin Pharma', 'Vendas', 'Ana', 'VENDAS', 'VENDAS', 'VENDAS', 'Vendas', 1000],
      ['Real', null, new Date(2026, 2, 5), 'STIN PHARMA', 'Vendas', 'Ana', 'CPV', 'CPV', 'CMV', 'Insumos', -400],
      ['Real', 1, null, '', '', '', '0', '0', '0', '0', -99],
      ['Talvez', 1, null, '', '', '', 'CPV', '', '', '', -1],
    ])
    expect(r.ajustesIgnorados).toBe(1)
    expect(r.erros).toHaveLength(1)
    expect(r.fatos.map((f) => [f.mes, f.empresa, f.valor])).toEqual([[2, 'STIN PHARMA', 1000], [3, 'STIN PHARMA', -400]])
  })

  it('exige as colunas principais', () => {
    expect(linhasParaFatos([['data', 'valor'], ['01/01/2026', '1']]).erros[0]).toMatch(/Movimento/)
  })
})

describe('DRE', () => {
  const { fatos } = linhasParaFatos([
    CAB,
    ['Real', 1, null, 'A', 'X', '', 'VENDAS', '', '', 'Vendas', 1000],
    ['Real', 1, null, 'A', 'X', '', 'IMPOSTOS S/VENDA', '', '', 'ICMS', -100],
    ['Real', 1, null, 'A', 'X', '', 'CPV', '', '', 'Insumos', -400],
    ['Real', 2, null, 'A', 'X', '', 'DESPESAS OPERACIONAIS', '', '', 'Aluguel', -200],
    ['Real', 2, null, 'A', 'X', '', 'IRPJ/CSLL', '', '', 'IR', -50],
    ['orçado', 1, null, 'A', 'X', '', 'VENDAS', '', '', 'Vendas', 1200],
    ['orçado', 1, null, 'A', 'X', '', 'CPV', '', '', 'Insumos', -300],
    ['forecast', 1, null, 'A', 'X', '', 'VENDAS', '', '', 'Vendas', 9999],
  ])
  const dre = montarDre(fatos, 'orcado')

  it('calcula subtotais em cascata', () => {
    expect(subtotal(dre, 'Receita líquida')).toMatchObject({ real: 900, comp: 1200 })
    expect(subtotal(dre, 'Lucro bruto')).toMatchObject({ real: 500, comp: 900 })
    expect(subtotal(dre, 'EBITDA')).toMatchObject({ real: 300, comp: 900 })
    expect(subtotal(dre, 'Lucro líquido')).toMatchObject({ real: 250, comp: 900 })
  })

  it('mantém a ordem da DRE', () => {
    expect(dre.map((l) => l.rotulo).slice(0, 5))
      .toEqual(['Receita bruta', '(−) Impostos sobre vendas', 'Receita líquida', '(−) CPV', 'Lucro bruto'])
  })

  it('separa por mês e marca meses sem dado', () => {
    expect(subtotalPorMes(fatos, 'orcado', 'Receita líquida', [1, 2, 3]))
      .toEqual([{ mes: 1, real: 900, comp: 1200 }, { mes: 2, real: 0, comp: null }, { mes: 3, real: null, comp: null }])
  })

  it('ordena desvios pelo tamanho', () => {
    expect(maioresDesvios(fatos, 'orcado').map((d) => [d.nome, d.desvio]))
      .toEqual([['Vendas', -200], ['Aluguel', -200], ['ICMS', -100], ['Insumos', -100], ['IR', -50]])
  })
})
