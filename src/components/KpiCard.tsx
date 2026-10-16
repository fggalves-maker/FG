import { percentualComSinal } from '../lib/format'

interface Props {
  rotulo: string
  valor: string
  /** Variação relativa vs. período anterior. */
  delta?: number | null
  /** Se subir é bom (receita) ou ruim (despesa). */
  subirEhBom?: boolean
  heroi?: boolean
  nota?: string
}

export function KpiCard({ rotulo, valor, delta, subirEhBom = true, heroi, nota }: Props) {
  const temDelta = delta != null && Number.isFinite(delta)
  const bom = temDelta && (delta! === 0 ? null : (delta! > 0) === subirEhBom)
  return (
    <div className={`cartao${heroi ? ' kpi-heroi' : ''}`}>
      <div className="kpi-rotulo">{rotulo}</div>
      <div className="kpi-valor">{valor}</div>
      {temDelta ? (
        <div className="kpi-delta">
          <span className={bom == null ? '' : bom ? 'bom' : 'ruim'}>
            {delta! > 0 ? '▲' : delta! < 0 ? '▼' : '•'} {percentualComSinal(delta!)}
          </span>
          <span>vs. mês anterior</span>
        </div>
      ) : nota ? (
        <div className="kpi-delta">{nota}</div>
      ) : null}
    </div>
  )
}
