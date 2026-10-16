import { useMemo, useState } from 'react'
import type { Lancamento, Tipo } from '../lib/types'
import { dataCurta, moeda } from '../lib/format'

const LIMITE = 20

export function TabelaLancamentos({ lancamentos }: { lancamentos: Lancamento[] }) {
  const [tipo, setTipo] = useState<Tipo | 'todos'>('todos')
  const [todos, setTodos] = useState(false)
  const filtrados = useMemo(
    () => lancamentos.filter((l) => tipo === 'todos' || l.tipo === tipo).slice().reverse(),
    [lancamentos, tipo],
  )
  const visiveis = todos ? filtrados : filtrados.slice(0, LIMITE)

  return (
    <div className="cartao">
      <div className="cabecalho-tabela">
        <div>
          <h2>Lançamentos</h2>
          <p className="sub" style={{ margin: 0 }}>{filtrados.length} lançamento(s) no período</p>
        </div>
        <label className="filtros">
          <span className="visualmente-oculto">Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo | 'todos')}>
            <option value="todos">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
        </label>
      </div>
      <div className="tabela-wrap">
        <table>
          <thead>
            <tr><th>Data</th><th>Descrição</th><th>Categoria</th><th>Tipo</th><th>Status</th><th className="num">Valor</th></tr>
          </thead>
          <tbody>
            {visiveis.map((l, i) => (
              <tr key={i}>
                <td>{dataCurta(l.data)}</td>
                <td>{l.descricao || '—'}</td>
                <td>{l.categoria}</td>
                <td>{l.tipo === 'receita' ? 'Receita' : 'Despesa'}</td>
                <td><span className="etiqueta">{l.status === 'pago' ? (l.tipo === 'receita' ? 'Recebido' : 'Pago') : 'Pendente'}</span></td>
                <td className="num">{l.tipo === 'despesa' ? '−' : ''}{moeda(l.valor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtrados.length > LIMITE && (
        <p style={{ textAlign: 'center' }}>
          <button className="botao" onClick={() => setTodos(!todos)}>
            {todos ? 'Mostrar menos' : `Mostrar todos (${filtrados.length})`}
          </button>
        </p>
      )}
    </div>
  )
}
