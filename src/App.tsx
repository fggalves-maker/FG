import { useEffect, useMemo, useRef, useState } from 'react'
import { gastosPorCentro, maioresDesvios, montarDre, subtotal, subtotalPorMes } from './lib/dre'
import { rotuloMes } from './lib/format'
import { importarArquivo, importarCsv } from './lib/parse'
import type { Cenario, Fato, ResultadoImportacao } from './lib/types'
import { KpiCard } from './components/KpiCard'
import { GastosPorCentro, GraficoMensal, MaioresDesvios } from './components/Graficos'
import { TabelaDre } from './components/TabelaDre'

const CENARIOS: { valor: Cenario; rotulo: string }[] = [
  { valor: 'orcado', rotulo: 'Orçado' },
  { valor: 'forecast', rotulo: 'Forecast' },
  { valor: 'anterior', rotulo: 'Ano anterior' },
]
const TODOS = ''

export default function App() {
  const [fatos, setFatos] = useState<Fato[]>([])
  const [origem, setOrigem] = useState('')
  const [erros, setErros] = useState<string[]>([])
  const [ajustes, setAjustes] = useState(0)
  const [comp, setComp] = useState<Cenario>('orcado')
  const [de, setDe] = useState(1)
  const [ate, setAte] = useState(12)
  const [empresa, setEmpresa] = useState(TODOS)
  const [centro, setCentro] = useState(TODOS)
  const entrada = useRef<HTMLInputElement>(null)

  function aplicar(r: ResultadoImportacao, nome: string) {
    setErros(r.erros)
    if (!r.fatos.length) return
    setFatos(r.fatos)
    setOrigem(nome)
    setAjustes(r.ajustesIgnorados)
    setEmpresa(TODOS)
    setCentro(TODOS)
    const mesesReal = r.fatos.filter((f) => f.cenario === 'real').map((f) => f.mes)
    setDe(1)
    setAte(mesesReal.length ? Math.max(...mesesReal) : 12)
    const temComp = (c: Cenario) => r.fatos.some((f) => f.cenario === c)
    setComp((atual) => (temComp(atual) ? atual : CENARIOS.find((c) => temComp(c.valor))?.valor ?? 'orcado'))
  }

  /** Carrega public/base.csv (gerado pelo script, fora do git) ou, sem ele, os dados de exemplo. */
  async function carregar(arquivo: 'base.csv' | 'exemplo.csv') {
    const resp = await fetch(`${import.meta.env.BASE_URL}${arquivo}`)
    const texto = resp.ok ? await resp.text() : ''
    if (!texto || texto.trimStart().startsWith('<')) return false // dev server devolve o index.html
    aplicar(await importarCsv(texto), arquivo === 'base.csv' ? 'base.csv' : 'Dados de exemplo (fictícios)')
    return true
  }

  useEffect(() => { void carregar('base.csv').then((ok) => ok || carregar('exemplo.csv')) }, [])

  async function aoEscolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0]
    e.target.value = ''
    if (!arquivo) return
    try {
      aplicar(await importarArquivo(arquivo), arquivo.name)
    } catch (err) {
      setErros([`Não foi possível ler “${arquivo.name}”: ${(err as Error).message}`])
    }
  }

  const empresas = useMemo(() => [...new Set(fatos.map((f) => f.empresa))].sort(), [fatos])
  const centros = useMemo(
    () => [...new Set(fatos.filter((f) => !empresa || f.empresa === empresa).map((f) => f.centroCusto))].sort(),
    [fatos, empresa],
  )
  const cenariosDisponiveis = CENARIOS.filter((c) => fatos.some((f) => f.cenario === c.valor))
  const rotuloComp = CENARIOS.find((c) => c.valor === comp)?.rotulo ?? ''

  const filtrados = useMemo(
    () => fatos.filter((f) => f.mes >= de && f.mes <= ate
      && (!empresa || f.empresa === empresa) && (!centro || f.centroCusto === centro)),
    [fatos, de, ate, empresa, centro],
  )
  const dre = useMemo(() => montarDre(filtrados, comp), [filtrados, comp])
  const meses = useMemo(() => Array.from({ length: ate - de + 1 }, (_, i) => de + i), [de, ate])
  const receitaMes = useMemo(() => subtotalPorMes(filtrados, comp, 'Receita líquida', meses), [filtrados, comp, meses])
  const ebitdaMes = useMemo(() => subtotalPorMes(filtrados, comp, 'EBITDA', meses), [filtrados, comp, meses])
  const desvios = useMemo(() => maioresDesvios(filtrados, comp), [filtrados, comp])
  const centrosGasto = useMemo(() => gastosPorCentro(filtrados, comp), [filtrados, comp])

  const rl = subtotal(dre, 'Receita líquida')
  const temDados = filtrados.some((f) => f.cenario === 'real' || f.cenario === comp)

  return (
    <div className="app">
      <header className="topo">
        <div>
          <h1>Real × Orçado</h1>
          <p>{origem ? `Fonte: ${origem}` : 'Importe a base para começar'}</p>
        </div>
        <div className="filtros">
          <button className="botao primario" onClick={() => entrada.current?.click()}>Importar base</button>
          <input ref={entrada} type="file" accept=".csv,.txt,.xlsx" hidden onChange={aoEscolherArquivo} />
        </div>
      </header>

      {fatos.length > 0 && (
        <div className="filtros barra-filtros">
          <label>Comparar com
            <select value={comp} onChange={(e) => setComp(e.target.value as Cenario)}>
              {cenariosDisponiveis.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
            </select>
          </label>
          <label>De
            <select value={de} onChange={(e) => { const v = Number(e.target.value); setDe(v); if (v > ate) setAte(v) }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{rotuloMes(i + 1)}</option>)}
            </select>
          </label>
          <label>Até
            <select value={ate} onChange={(e) => { const v = Number(e.target.value); setAte(v); if (v < de) setDe(v) }}>
              {Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{rotuloMes(i + 1)}</option>)}
            </select>
          </label>
          <label>Empresa
            <select value={empresa} onChange={(e) => { setEmpresa(e.target.value); setCentro(TODOS) }}>
              <option value={TODOS}>Todas</option>
              {empresas.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
          <label>Centro de custo
            <select value={centro} onChange={(e) => setCentro(e.target.value)}>
              <option value={TODOS}>Todos</option>
              {centros.map((x) => <option key={x}>{x}</option>)}
            </select>
          </label>
        </div>
      )}

      {erros.length > 0 && (
        <div className="aviso" role="alert">
          {erros.length} linha(s) ignorada(s) na importação.
          <ul>{erros.slice(0, 5).map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      {!temDados ? (
        <div className="cartao vazio">Nenhum lançamento no período e filtros escolhidos.</div>
      ) : (
        <>
          <section className="grade-kpi" aria-label="Indicadores">
            <KpiCard heroi rotulo="Receita líquida" {...rl} rotuloComp={rotuloComp} />
            <KpiCard rotulo="Lucro bruto" {...subtotal(dre, 'Lucro bruto')} rotuloComp={rotuloComp} base={rl.real} />
            <KpiCard rotulo="EBITDA" {...subtotal(dre, 'EBITDA')} rotuloComp={rotuloComp} base={rl.real} />
            <KpiCard rotulo="Lucro líquido" {...subtotal(dre, 'Lucro líquido')} rotuloComp={rotuloComp} base={rl.real} />
          </section>

          <section className="grade-graficos">
            <GraficoMensal titulo="Receita líquida por mês" sub="Receita bruta menos impostos, devoluções e bonificações"
              dados={receitaMes} rotuloComp={rotuloComp} />
            <GraficoMensal titulo="EBITDA por mês" sub="Lucro bruto menos despesas com vendas e operacionais"
              dados={ebitdaMes} rotuloComp={rotuloComp} />
          </section>

          <TabelaDre dre={dre} rotuloComp={rotuloComp} />

          <section className="grade-graficos" style={{ marginTop: 16 }}>
            <MaioresDesvios dados={desvios} rotuloComp={rotuloComp} />
            <GastosPorCentro dados={centrosGasto} rotuloComp={rotuloComp} />
          </section>

          {ajustes > 0 && (
            <p className="nota">
              {ajustes} linha(s) com N1 = 0 (ajustes gerenciais e contrapartidas) ficaram fora da DRE.
            </p>
          )}
        </>
      )}
    </div>
  )
}
