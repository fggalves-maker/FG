export type Cenario = 'real' | 'orcado' | 'forecast' | 'anterior'

/** Uma linha da base: soma do Movimento de um mês num recorte de conta e centro de custo. */
export interface Fato {
  cenario: Cenario
  mes: number // 1–12
  empresa: string
  centroCusto: string
  dono: string
  n1: string
  n2: string
  n3: string
  n4: string
  /** Com sinal: receitas positivas, custos e despesas negativos. */
  valor: number
}

export interface ResultadoImportacao {
  fatos: Fato[]
  erros: string[]
  /** Linhas com N1 = 0 (ajustes gerenciais, contrapartidas) que ficam fora da DRE. */
  ajustesIgnorados: number
}
