import { Fragment, useState } from 'react'
import { type LinhaDre, variacao } from '../lib/dre'
import { moeda, percentualComSinal } from '../lib/format'

function Linha({ l, aberto, alternar }: { l: LinhaDre; aberto: boolean; alternar?: () => void }) {
  const desvio = l.real - l.comp
  const pct = variacao(l.real, l.comp)
  const classe = desvio > 0.5 ? 'bom' : desvio < -0.5 ? 'ruim' : ''
  return (
    <tr className={`nivel-${l.nivel}${l.subtotal ? ' subtotal' : ''}`}>
      <td>
        {alternar ? (
          <button className="expandir" onClick={alternar} aria-expanded={aberto}>
            <span aria-hidden>{aberto ? '▾' : '▸'}</span> {l.rotulo}
          </button>
        ) : <span className="sem-filhos">{l.rotulo}</span>}
      </td>
      <td className="num">{moeda(l.real)}</td>
      <td className="num">{moeda(l.comp)}</td>
      <td className={`num ${classe}`}>{moeda(desvio)}</td>
      <td className={`num ${classe}`}>{pct == null ? '—' : percentualComSinal(pct)}</td>
    </tr>
  )
}

export function TabelaDre({ dre, rotuloComp }: { dre: LinhaDre[]; rotuloComp: string }) {
  const [abertos, setAbertos] = useState<Set<string>>(new Set())
  const alternar = (id: string) => setAbertos((a) => {
    const n = new Set(a)
    if (!n.delete(id)) n.add(id)
    return n
  })
  const render = (l: LinhaDre): React.ReactNode => {
    const aberto = abertos.has(l.id)
    return (
      <Fragment key={l.id}>
        <Linha l={l} aberto={aberto} alternar={l.filhos?.length ? () => alternar(l.id) : undefined} />
        {aberto && l.filhos?.map(render)}
      </Fragment>
    )
  }
  return (
    <div className="cartao">
      <h2>DRE gerencial</h2>
      <p className="sub">Clique numa linha para abrir os níveis N3 e N4. Desvio = Real − {rotuloComp}; verde é favorável.</p>
      <div className="tabela-wrap">
        <table className="dre">
          <thead>
            <tr><th>Conta</th><th className="num">Real</th><th className="num">{rotuloComp}</th><th className="num">Desvio</th><th className="num">Desvio %</th></tr>
          </thead>
          <tbody>{dre.map(render)}</tbody>
        </table>
      </div>
    </div>
  )
}
