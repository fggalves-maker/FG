export type Tipo = 'receita' | 'despesa'
export type Status = 'pago' | 'pendente'

export interface Lancamento {
  data: Date
  descricao: string
  categoria: string
  tipo: Tipo
  /** Sempre positivo; o sinal vem de `tipo`. */
  valor: number
  status: Status
}

export interface ResultadoImportacao {
  lancamentos: Lancamento[]
  erros: string[]
}
