import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { Desvio, MesDre } from '../lib/dre'
import { moeda, moedaCompacta, rotuloMes } from '../lib/format'

const eixo = { stroke: 'var(--grid)', tick: { fill: 'var(--text-muted)', fontSize: 12 }, tickLine: false }

interface ItemTooltip { name?: string; value?: number | null; color?: string; dataKey?: string | number }

function CaixaTooltip({ active, payload, label, titulo }: {
  active?: boolean; payload?: ItemTooltip[]; label?: string | number; titulo?: (l: string | number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="tooltip">
      <strong>{titulo ? titulo(label ?? '') : label}</strong>
      {payload.filter((p) => p.value != null).map((p) => (
        <div key={String(p.dataKey)}>
          <i style={{ background: p.color }} />
          {p.name}
          <b>{moeda(Number(p.value))}</b>
        </div>
      ))}
    </div>
  )
}

function Legenda({ rotuloComp }: { rotuloComp: string }) {
  return (
    <div className="legenda" aria-hidden>
      <span><i style={{ background: 'var(--series-real)' }} />Real</span>
      <span><i style={{ background: 'var(--series-comp)' }} />{rotuloComp}</span>
    </div>
  )
}

export function GraficoMensal({ titulo, sub, dados, rotuloComp }: {
  titulo: string; sub: string; dados: MesDre[]; rotuloComp: string
}) {
  return (
    <div className="cartao">
      <h2>{titulo}</h2>
      <p className="sub">{sub}</p>
      <Legenda rotuloComp={rotuloComp} />
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={dados} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="mes" tickFormatter={rotuloMes} {...eixo} />
          <YAxis tickFormatter={moedaCompacta} width={76} axisLine={false} {...eixo} />
          <ReferenceLine y={0} stroke="var(--text-muted)" />
          <Tooltip cursor={{ fill: 'var(--grid)', opacity: 0.5 }} content={<CaixaTooltip titulo={(m) => rotuloMes(Number(m))} />} />
          <Bar dataKey="real" name="Real" fill="var(--series-real)" radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          <Line dataKey="comp" name={rotuloComp} stroke="var(--series-comp)" strokeWidth={2} isAnimationActive={false}
            dot={{ r: 4, fill: 'var(--series-comp)', stroke: 'var(--surface-1)', strokeWidth: 2 }} connectNulls={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function MaioresDesvios({ dados, rotuloComp }: { dados: Desvio[]; rotuloComp: string }) {
  const altura = Math.max(160, dados.length * 34 + 24)
  return (
    <div className="cartao">
      <h2>Maiores desvios por conta</h2>
      <p className="sub">Real − {rotuloComp}, nas contas N4 com maior diferença</p>
      <div className="legenda" aria-hidden>
        <span><i style={{ background: 'var(--good)' }} />▲ Favorável</span>
        <span><i style={{ background: 'var(--critical)' }} />▼ Desfavorável</span>
      </div>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--grid)" />
          <XAxis type="number" tickFormatter={moedaCompacta} {...eixo} axisLine={false} />
          <YAxis type="category" dataKey="nome" width={170} {...eixo} axisLine={false} interval={0}
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            tickFormatter={(t: string) => (t.length > 26 ? `${t.slice(0, 25)}…` : t)} />
          <ReferenceLine x={0} stroke="var(--text-muted)" />
          <Tooltip cursor={{ fill: 'var(--grid)', opacity: 0.5 }} content={<CaixaDesvio rotuloComp={rotuloComp} />} />
          <Bar dataKey="desvio" name="Desvio" radius={4} maxBarSize={18} isAnimationActive={false}>
            {dados.map((d) => <Cell key={d.nome} fill={d.desvio > 0 ? 'var(--good)' : 'var(--critical)'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

function CaixaDesvio({ active, payload, rotuloComp }: { active?: boolean; payload?: { payload: Desvio }[]; rotuloComp: string }) {
  const d = active && payload?.[0]?.payload
  if (!d) return null
  return (
    <div className="tooltip">
      <strong>{d.nome}</strong>
      <div>Real<b>{moeda(d.real)}</b></div>
      <div>{rotuloComp}<b>{moeda(d.comp)}</b></div>
      <div>{d.desvio > 0 ? '▲ Favorável' : '▼ Desfavorável'}<b>{moeda(d.desvio)}</b></div>
    </div>
  )
}

export function GastosPorCentro({ dados, rotuloComp }: {
  dados: { centro: string; real: number; comp: number }[]; rotuloComp: string
}) {
  const altura = Math.max(160, dados.length * 44 + 24)
  return (
    <div className="cartao">
      <h2>Custos e despesas por centro de custo</h2>
      <p className="sub">CPV, despesas com vendas e operacionais no período</p>
      <Legenda rotuloComp={rotuloComp} />
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={dados} layout="vertical" barGap={2} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--grid)" />
          <XAxis type="number" tickFormatter={moedaCompacta} {...eixo} axisLine={false} />
          <YAxis type="category" dataKey="centro" width={150} {...eixo} axisLine={false} interval={0}
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} />
          <Tooltip cursor={{ fill: 'var(--grid)', opacity: 0.5 }} content={<CaixaTooltip />} />
          <Bar dataKey="real" name="Real" fill="var(--series-real)" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false} />
          <Bar dataKey="comp" name={rotuloComp} fill="var(--series-comp)" radius={[0, 4, 4, 0]} maxBarSize={14} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
