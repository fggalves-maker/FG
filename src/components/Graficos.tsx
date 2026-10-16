import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import type { Mes } from '../lib/aggregate'
import { moeda, moedaCompacta, rotuloMes } from '../lib/format'

const eixo = { stroke: 'var(--grid)', tick: { fill: 'var(--text-muted)', fontSize: 12 }, tickLine: false }

interface ItemTooltip { name?: string; value?: number; color?: string; dataKey?: string | number }

function CaixaTooltip({ active, payload, label, titulo }: {
  active?: boolean; payload?: ItemTooltip[]; label?: string; titulo?: (l: string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="tooltip">
      <strong>{titulo ? titulo(String(label)) : label}</strong>
      {payload.map((p) => (
        <div key={String(p.dataKey)}>
          <i style={{ background: p.color }} />
          {p.name}
          <b>{moeda(Number(p.value))}</b>
        </div>
      ))}
    </div>
  )
}

export function ReceitasDespesas({ meses }: { meses: Mes[] }) {
  return (
    <div className="cartao">
      <h2>Receitas e despesas por mês</h2>
      <p className="sub">Valores brutos lançados em cada mês</p>
      <div className="legenda" aria-hidden>
        <span><i style={{ background: 'var(--series-receita)' }} />Receitas</span>
        <span><i style={{ background: 'var(--series-despesa)' }} />Despesas</span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={meses} barGap={2} barCategoryGap="25%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="chave" tickFormatter={rotuloMes} {...eixo} />
          <YAxis tickFormatter={moedaCompacta} width={72} axisLine={false} {...eixo} />
          <Tooltip cursor={{ fill: 'var(--grid)', opacity: 0.5 }} content={<CaixaTooltip titulo={rotuloMes} />} />
          <Bar dataKey="receitas" name="Receitas" fill="var(--series-receita)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
          <Bar dataKey="despesas" name="Despesas" fill="var(--series-despesa)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SaldoAcumulado({ meses }: { meses: Mes[] }) {
  return (
    <div className="cartao">
      <h2>Fluxo de caixa acumulado</h2>
      <p className="sub">Soma dos resultados mensais desde o início do período</p>
      <ResponsiveContainer width="100%" height={284}>
        <AreaChart data={meses} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis dataKey="chave" tickFormatter={rotuloMes} {...eixo} />
          <YAxis tickFormatter={moedaCompacta} width={72} axisLine={false} {...eixo} />
          <ReferenceLine y={0} stroke="var(--text-muted)" />
          <Tooltip cursor={{ stroke: 'var(--text-muted)', strokeWidth: 1 }} content={<CaixaTooltip titulo={rotuloMes} />} />
          <Area
            type="monotone" dataKey="saldoAcumulado" name="Saldo acumulado"
            stroke="var(--series-receita)" strokeWidth={2} fill="var(--series-receita)" fillOpacity={0.1}
            dot={false} isAnimationActive={false} activeDot={{ r: 5, stroke: 'var(--surface-1)', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function DespesasCategoria({ dados }: { dados: { categoria: string; valor: number }[] }) {
  const altura = Math.max(160, dados.length * 36 + 24)
  return (
    <div className="cartao">
      <h2>Despesas por categoria</h2>
      <p className="sub">Total no período, da maior para a menor</p>
      <ResponsiveContainer width="100%" height={altura}>
        <BarChart data={dados} layout="vertical" margin={{ top: 0, right: 72, left: 0, bottom: 0 }}>
          <CartesianGrid horizontal={false} stroke="var(--grid)" />
          <XAxis type="number" tickFormatter={moedaCompacta} {...eixo} axisLine={false} />
          <YAxis type="category" dataKey="categoria" width={130} {...eixo} axisLine={false}
            tick={{ fill: 'var(--text-secondary)', fontSize: 13 }} />
          <Tooltip cursor={{ fill: 'var(--grid)', opacity: 0.5 }} content={<CaixaTooltip />} />
          <Bar dataKey="valor" name="Despesas" fill="var(--series-despesa)" radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}
            label={{ position: 'right', fill: 'var(--text-secondary)', fontSize: 12, formatter: (v: unknown) => moedaCompacta(Number(v)) }} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
