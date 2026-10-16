import type { Cenario, Fato, ResultadoImportacao } from './types'

type Celula = string | number | boolean | Date | null | undefined
type Campo = 'cenario' | 'mes' | 'data' | 'empresa' | 'centroCusto' | 'dono' | 'n1' | 'n2' | 'n3' | 'n4' | 'valor'

const ALIASES: Record<Campo, string[]> = {
  cenario: ['real / orcado', 'real/orcado', 'cenario'],
  mes: ['mes'],
  data: ['data'],
  empresa: ['empresa'],
  centroCusto: ['descricao c.c', 'centro de custo', 'c.c'],
  dono: ['dono c.c', 'dono'],
  n1: ['n1'], n2: ['n2'], n3: ['n3'], n4: ['n4'],
  valor: ['movimento', 'valor'],
}
const OBRIGATORIOS: Campo[] = ['cenario', 'n1', 'valor']

export function normalizar(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toLowerCase().replace(/\s+/g, ' ')
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

/** "Real", "orçado", "Forecast"/"forecast", "Real 2025" (ano anterior). */
export function parseCenario(celula: Celula): Cenario | null {
  const s = normalizar(String(celula ?? ''))
  if (/^real\s*\d{4}$/.test(s) || s === 'ano anterior') return 'anterior'
  if (s === 'real' || s === 'realizado') return 'real'
  if (s === 'orcado' || s === 'orcamento' || s === 'budget') return 'orcado'
  if (s === 'forecast' || s === 'previsto') return 'forecast'
  return null
}

function parseMes(mes: Celula, data: Celula): number | null {
  const n = parseValor(mes)
  if (n != null && Number.isInteger(n) && n >= 1 && n <= 12) return n
  if (data instanceof Date && !Number.isNaN(data.getTime())) return data.getMonth() + 1
  const m = String(data ?? '').match(/^\d{1,2}\/(\d{1,2})\/\d{2,4}$|^\d{4}-(\d{1,2})-/)
  const doTexto = m ? Number(m[1] ?? m[2]) : NaN
  return doTexto >= 1 && doTexto <= 12 ? doTexto : null
}

const texto = (c: Celula) => (c == null ? '' : String(c).trim())

/** Padroniza grafias da mesma empresa ("Conectar", "CONECTAR"). */
function parseEmpresa(c: Celula) {
  return texto(c).toUpperCase().replace(/\s+/g, ' ') || 'Sem empresa'
}

/** Converte linhas (com cabeçalho em alguma das primeiras linhas) em fatos. */
export function linhasParaFatos(linhas: Celula[][]): ResultadoImportacao {
  const erros: string[] = []
  const vazio = { fatos: [], ajustesIgnorados: 0 }
  const colunasDe = (linha: Celula[]) => {
    const cab = linha.map((c) => normalizar(texto(c)))
    const coluna = {} as Record<Campo, number>
    for (const campo of Object.keys(ALIASES) as Campo[]) {
      coluna[campo] = ALIASES[campo].map((a) => cab.indexOf(a)).find((i) => i >= 0) ?? -1
    }
    return coluna
  }
  // O cabeçalho da base fica na 2ª linha (há um link "Voltar para CAPA" acima).
  const iCabecalho = linhas.slice(0, 20).findIndex((l) => OBRIGATORIOS.every((c) => colunasDe(l)[c] >= 0))
  if (iCabecalho < 0) {
    if (!linhas.some((l) => l.some((c) => texto(c)))) return { ...vazio, erros: ['O arquivo está vazio.'] }
    return { ...vazio, erros: ['Colunas obrigatórias não encontradas: “Real / Orçado”, “N1” e “Movimento”.'] }
  }
  const coluna = colunasDe(linhas[iCabecalho])
  if (coluna.mes < 0 && coluna.data < 0) return { ...vazio, erros: ['Falta a coluna “Mês” (ou “Data”).'] }

  const fatos: Fato[] = []
  let ajustesIgnorados = 0
  linhas.slice(iCabecalho + 1).forEach((linha, i) => {
    const nLinha = iCabecalho + i + 2
    const pega = (campo: Campo) => (coluna[campo] >= 0 ? linha[coluna[campo]] : undefined)
    const valor = parseValor(pega('valor'))
    if (!valor) return // linhas vazias ou sem movimento
    const n1 = texto(pega('n1'))
    if (!n1 || n1 === '0') return void ajustesIgnorados++
    const cenario = parseCenario(pega('cenario'))
    if (!cenario) return void erros.push(`Linha ${nLinha}: cenário desconhecido (“${texto(pega('cenario'))}”).`)
    const mes = parseMes(pega('mes'), pega('data'))
    if (!mes) return void erros.push(`Linha ${nLinha}: mês inválido (“${texto(pega('mes'))}”).`)
    fatos.push({
      cenario, mes, valor, n1,
      empresa: parseEmpresa(pega('empresa')),
      centroCusto: texto(pega('centroCusto')) || 'Sem centro de custo',
      dono: texto(pega('dono')),
      n2: texto(pega('n2')) || n1,
      n3: texto(pega('n3')) || n1,
      n4: texto(pega('n4')) || n1,
    })
  })
  return { fatos, erros, ajustesIgnorados }
}

export async function importarArquivo(arquivo: File): Promise<ResultadoImportacao> {
  const nome = arquivo.name.toLowerCase()
  if (nome.endsWith('.xlsx')) {
    const { readSheet } = await import('read-excel-file/browser')
    return linhasParaFatos((await readSheet(arquivo)) as Celula[][])
  }
  if (nome.endsWith('.csv') || nome.endsWith('.txt')) {
    return importarCsv(await arquivo.text())
  }
  return { fatos: [], ajustesIgnorados: 0, erros: ['Formato não suportado. Use .csv ou .xlsx.'] }
}

export async function importarCsv(texto: string): Promise<ResultadoImportacao> {
  const Papa = (await import('papaparse')).default
  const { data } = Papa.parse<string[]>(texto.replace(/^﻿/, ''), { skipEmptyLines: true })
  return linhasParaFatos(data)
}
