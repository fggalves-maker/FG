import { variacao } from '../lib/dre'
import { moeda, percentual, percentualComSinal } from '../lib/format'

interface Props {
  rotulo: string
  real: number
  comp: number
  rotuloComp: string
  /** Base para a margem (receita líquida), quando faz sentido mostrar. */
  base?: number
  heroi?: boolean
}

/** Valores com sinal: Real acima da comparação é sempre favorável. */
export function KpiCard({ rotulo, real, comp, rotuloComp, base, heroi }: Props) {
  const delta = variacao(real, comp)
  const sinal = real - comp
  return (
    <div className={`cartao${heroi ? ' kpi-heroi' : ''}`}>
      <div className="kpi-rotulo">{rotulo}</div>
      <div className="kpi-valor">{moeda(real)}</div>
      <div className="kpi-delta">
        {delta != null && (
          <span className={sinal > 0 ? 'bom' : sinal < 0 ? 'ruim' : ''}>
            {sinal > 0 ? '▲' : sinal < 0 ? '▼' : '•'} {percentualComSinal(delta)}
          </span>
        )}
        <span>vs. {rotuloComp} {moeda(comp)}</span>
      </div>
      {base ? <div className="kpi-delta">Margem {percentual(real / base)}</div> : null}
    </div>
  )
}
