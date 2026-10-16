import type { Lancamento, ResultadoImportacao, Status, Tipo } from './types'

type Celula = string | number | boolean | Date | null | undefined

const ALIASES: Record<keyof Lancamento, string[]> = {
  data: ['data', 'date', 'dt', 'vencimento', 'competencia'],
  descricao: ['descricao', 'historico', 'description', 'memo'],
  categoria: ['categoria', 'category', 'conta', 'plano de contas'],
  tipo: ['tipo', 'type', 'natureza'],
  valor: ['valor', 'value', 'amount', 'montante'],
  status: ['status', 'situacao'],
}

function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase()
}

/** Aceita 1.234,56 · 1234.56 · R$ -1.234,56 · (1.234,56). */
export function parseValor(celula: Celula): number | null {
  if (typeof celula === 'number') return Number.isFinite(celula) ? celula : null
  if (celula == null) return null
  let s = String(celula).trim().replace(/R\$\s?/i, '').replace(/\s/g, '')
  if (!s) return null
  let negativo = false
  if (/^\(.*\)$/.test(s)) {
    negativo = true
    s = s.slice(1, -1)
  }
  if (s.startsWith('-')) {
    negativo = !negativo
    s = s.slice(1)
  }
  const ultimaVirgula = s.lastIndexOf(',')
  const ultimoPonto = s.lastIndexOf('.')
  if (ultimaVirgula > ultimoPonto) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  const n = Number(s)
  if (!Number.isFinite(n)) return null
  return negativo ? -n : n
}

/** Aceita dd/mm/aaaa, dd-mm-aaaa, aaaa-mm-dd e objetos Date (Excel). */
export function parseData(celula: Celula): Date | null {
  if (celula instanceof Date) return Number.isNaN(celula.getTime()) ? null : celula
  if (celula == null) return null
  const s = String(celula).trim()
  let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (m) {
    const ano = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    return dataValida(ano, Number(m[2]), Number(m[1]))
  }
  m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (m) return dataValida(Number(m[1]), Number(m[2]), Number(m[3]))
  return null
}

function dataValida(ano: number, mes: number, dia: number): Date | null {
  const d = new Date(ano, mes - 1, dia)
  return d.getFullYear() === ano && d.getMonth() === mes - 1 && d.getDate() === dia ? d : null
}

function parseTipo(celula: Celula, valor: number): Tipo | null {
  const s = normalizar(String(celula ?? ''))
  if (!s) return valor < 0 ? 'despesa' : 'receita'
  if (['receita', 'entrada', 'credito', 'c', 'r', 'income'].includes(s)) return 'receita'
  if (['despesa', 'saida', 'debito', 'd', 'custo', 'expense'].includes(s)) return 'despesa'
  return null
}

function parseStatus(celula: Celula): Status {
  const s = normalizar(String(celula ?? ''))
  return ['pendente', 'aberto', 'em aberto', 'a pagar', 'a receber', 'previsto'].includes(s)
    ? 'pendente'
    : 'pago'
}

/** Converte linhas (primeira linha = cabeçalho) em lançamentos. */
export function linhasParaLancamentos(linhas: Celula[][]): ResultadoImportacao {
  const erros: string[] = []
  const iCabecalho = linhas.findIndex((l) => l.some((c) => c != null && String(c).trim() !== ''))
  if (iCabecalho < 0) return { lancamentos: [], erros: ['O arquivo está vazio.'] }

  const cabecalho = linhas[iCabecalho].map((c) => normalizar(String(c ?? '')))
  const coluna = {} as Record<keyof Lancamento, number>
  for (const campo of Object.keys(ALIASES) as (keyof Lancamento)[]) {
    coluna[campo] = cabecalho.findIndex((h) => ALIASES[campo].includes(h))
  }
  const faltando = (['data', 'valor'] as const).filter((c) => coluna[c] < 0)
  if (faltando.length) {
    return {
      lancamentos: [],
      erros: [`Coluna(s) obrigatória(s) não encontrada(s): ${faltando.join(', ')}.`],
    }
  }

  const lancamentos: Lancamento[] = []
  linhas.slice(iCabecalho + 1).forEach((linha, i) => {
    const nLinha = iCabecalho + i + 2
    if (linha.every((c) => c == null || String(c).trim() === '')) return
    const pega = (campo: keyof Lancamento) => (coluna[campo] >= 0 ? linha[coluna[campo]] : undefined)

    const data = parseData(pega('data'))
    const valorBruto = parseValor(pega('valor'))
    if (!data) return void erros.push(`Linha ${nLinha}: data inválida (“${pega('data') ?? ''}”).`)
    if (valorBruto == null) return void erros.push(`Linha ${nLinha}: valor inválido (“${pega('valor') ?? ''}”).`)
    const tipo = parseTipo(pega('tipo'), valorBruto)
    if (!tipo) return void erros.push(`Linha ${nLinha}: tipo deve ser “receita” ou “despesa”.`)

    lancamentos.push({
      data,
      descricao: String(pega('descricao') ?? '').trim(),
      categoria: String(pega('categoria') ?? '').trim() || 'Sem categoria',
      tipo,
      valor: Math.abs(valorBruto),
      status: parseStatus(pega('status')),
    })
  })

  lancamentos.sort((a, b) => a.data.getTime() - b.data.getTime())
  return { lancamentos, erros }
}

export async function importarArquivo(arquivo: File): Promise<ResultadoImportacao> {
  const nome = arquivo.name.toLowerCase()
  if (nome.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser')
    return linhasParaLancamentos((await readSheet(arquivo)) as Celula[][])
  }
  if (nome.endsWith('.csv') || nome.endsWith('.txt')) {
    return importarCsv(await arquivo.text())
  }
  return { lancamentos: [], erros: ['Formato não suportado. Use .csv ou .xlsx.'] }
}

export async function importarCsv(texto: string): Promise<ResultadoImportacao> {
  const Papa = (await import('papaparse')).default
  const { data } = Papa.parse<string[]>(texto.replace(/^﻿/, ''), { skipEmptyLines: true })
  return linhasParaLancamentos(data)
}
