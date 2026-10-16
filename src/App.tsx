import { useEffect, useMemo, useRef, useState } from 'react'
import { chaveMes, despesasPorCategoria, kpis, porMes, variacao } from './lib/aggregate'
import { moeda, percentual, rotuloMes } from './lib/format'
import { importarArquivo, importarCsv } from './lib/parse'
import type { Lancamento, ResultadoImportacao } from './lib/types'
import { KpiCard } from './components/KpiCard'
import { DespesasCategoria, ReceitasDespesas, SaldoAcumulado } from './components/Graficos'
import { TabelaLancamentos } from './components/TabelaLancamentos'

export default function App() {
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [origem, setOrigem] = useState('')
  const [erros, setErros] = useState<string[]>([])
  const [de, setDe] = useState('')
  const [ate, setAte] = useState('')
  const entrada = useRef<HTMLInputElement>(null)

  function aplicar(r: ResultadoImportacao, nome: string) {
    setErros(r.erros)
    if (!r.lancamentos.length) return
    setLancamentos(r.lancamentos)
    setOrigem(nome)
    setDe(chaveMes(r.lancamentos[0].data))
    setAte(chaveMes(r.lancamentos[r.lancamentos.length - 1].data))
  }

  async function carregarExemplo() {
    const resp = await fetch(`${import.meta.env.BASE_URL}exemplo.csv`)
    aplicar(await importarCsv(await resp.text()), 'Dados de exemplo')
  }

  useEffect(() => { void carregarExemplo() }, [])

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

  const mesesDisponiveis = useMemo(() => porMes(lancamentos).map((m) => m.chave), [lancamentos])
  const noPeriodo = useMemo(
    () => lancamentos.filter((l) => { const k = chaveMes(l.data); return k >= de && k <= ate }),
    [lancamentos, de, ate],
  )
  const meses = useMemo(() => porMes(noPeriodo), [noPeriodo])
  const k = useMemo(() => kpis(noPeriodo), [noPeriodo])
  const categorias = useMemo(() => despesasPorCategoria(noPeriodo), [noPeriodo])

  // Com um único mês selecionado, compara com o mês anterior.
  const anterior = useMemo(() => {
    if (de !== ate) return null
    const i = mesesDisponiveis.indexOf(de)
    if (i <= 0) return null
    const chave = mesesDisponiveis[i - 1]
    return kpis(lancamentos.filter((l) => chaveMes(l.data) === chave))
  }, [de, ate, mesesDisponiveis, lancamentos])

  return (
    <div className="app">
      <header className="topo">
        <div>
          <h1>Dashboard financeiro</h1>
          <p>{origem ? `Fonte: ${origem}` : 'Importe uma planilha para começar'}</p>
        </div>
        <div className="filtros">
          {mesesDisponiveis.length > 0 && (
            <>
              <label>De
                <select value={de} onChange={(e) => { setDe(e.target.value); if (e.target.value > ate) setAte(e.target.value) }}>
                  {mesesDisponiveis.map((m) => <option key={m} value={m}>{rotuloMes(m)}</option>)}
                </select>
              </label>
              <label>Até
                <select value={ate} onChange={(e) => { setAte(e.target.value); if (e.target.value < de) setDe(e.target.value) }}>
                  {mesesDisponiveis.map((m) => <option key={m} value={m}>{rotuloMes(m)}</option>)}
                </select>
              </label>
            </>
          )}
          <button className="botao" onClick={() => void carregarExemplo()}>Usar exemplo</button>
          <button className="botao primario" onClick={() => entrada.current?.click()}>Importar CSV/Excel</button>
          <input ref={entrada} type="file" accept=".csv,.txt,.xlsx" hidden onChange={aoEscolherArquivo} />
        </div>
      </header>

      {erros.length > 0 && (
        <div className="aviso" role="alert">
          {erros.length} linha(s) ignorada(s) na importação.
          <ul>{erros.slice(0, 5).map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      {noPeriodo.length === 0 ? (
        <div className="cartao vazio">Nenhum lançamento no período.</div>
      ) : (
        <>
          <section className="grade-kpi" aria-label="Indicadores">
            <KpiCard heroi rotulo="Resultado" valor={moeda(k.resultado)}
              delta={anterior && variacao(k.resultado, anterior.resultado)} />
            <KpiCard rotulo="Receitas" valor={moeda(k.receitas)}
              delta={anterior && variacao(k.receitas, anterior.receitas)} />
            <KpiCard rotulo="Despesas" valor={moeda(k.despesas)} subirEhBom={false}
              delta={anterior && variacao(k.despesas, anterior.despesas)} />
            <KpiCard rotulo="Margem" valor={k.margem == null ? '—' : percentual(k.margem)} nota="Resultado ÷ receitas" />
            <KpiCard rotulo="A receber" valor={moeda(k.aReceber)} nota="Receitas pendentes" />
            <KpiCard rotulo="A pagar" valor={moeda(k.aPagar)} nota="Despesas pendentes" />
          </section>

          <section className="grade-graficos">
            <ReceitasDespesas meses={meses} />
            <SaldoAcumulado meses={meses} />
          </section>
          <section className="grade-graficos">
            <DespesasCategoria dados={categorias} />
          </section>

          <TabelaLancamentos lancamentos={noPeriodo} />
        </>
      )}
    </div>
  )
}
