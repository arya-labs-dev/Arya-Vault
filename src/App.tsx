import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getBalance, requestPersistence, type Pot, type Transaction } from './db'
import { formatRupees } from './lib/money'
import { getRows, type Row } from './lib/rows'
import { CountSheet } from './components/CountSheet'
import { EntrySheet } from './components/EntrySheet'
import { History } from './components/History'
import { MoveSheet } from './components/MoveSheet'
import { RowItem } from './components/RowItem'

type Tab = 'home' | 'history'
type SheetState =
  | { kind: 'entry'; type: 'in' | 'out' }
  | { kind: 'move' }
  | { kind: 'count'; pot: Pot }
  | { kind: 'edit'; tx: Transaction }
  | null

export default function App() {
  const [tab, setTab] = useState<Tab>('home')
  const [sheet, setSheet] = useState<SheetState>(null)
  const cash = useLiveQuery(() => getBalance('cash'), [], 0)
  const upi = useLiveQuery(() => getBalance('upi'), [], 0)
  const recent: Row[] = useLiveQuery(() => getRows(6), [], [])

  useEffect(() => {
    void requestPersistence()
  }, [])

  const close = () => setSheet(null)
  const edit = (tx: Transaction) => setSheet({ kind: 'edit', tx })

  return (
    <main className="home">
      <header className="top">
        <div className="brand">Arya Vault</div>
        <nav className="tabs">
          <button type="button" className={tab === 'home' ? 'on' : ''} onClick={() => setTab('home')}>
            Home
          </button>
          <button type="button" className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>
            History
          </button>
        </nav>
      </header>

      {tab === 'home' ? (
        <>
          <section className="pots">
            <button type="button" className="pot" onClick={() => setSheet({ kind: 'count', pot: 'cash' })}>
              <small>Cash</small>
              <strong>{formatRupees(cash)}</strong>
              <em>Tap to count</em>
            </button>
            <button type="button" className="pot" onClick={() => setSheet({ kind: 'count', pot: 'upi' })}>
              <small>UPI</small>
              <strong>{formatRupees(upi)}</strong>
              <em>Tap to set</em>
            </button>
          </section>
          <div className="total">Total {formatRupees(cash + upi)}</div>

          <ul className="recent">
            {recent.length === 0 && <li className="empty">Nothing yet. Log your first one.</li>}
            {recent.map((r) => (
              <RowItem key={r.tx.id} row={r} onClick={() => edit(r.tx)} />
            ))}
          </ul>

          <div className="actions">
            <button type="button" className="btn-in" onClick={() => setSheet({ kind: 'entry', type: 'in' })}>
              In
            </button>
            <button type="button" className="btn-out" onClick={() => setSheet({ kind: 'entry', type: 'out' })}>
              Out
            </button>
            <button type="button" className="btn-move" onClick={() => setSheet({ kind: 'move' })}>
              Move
            </button>
          </div>
        </>
      ) : (
        <History onSelect={edit} />
      )}

      {sheet?.kind === 'entry' && <EntrySheet type={sheet.type} onClose={close} />}
      {sheet?.kind === 'move' && <MoveSheet onClose={close} />}
      {sheet?.kind === 'count' && <CountSheet pot={sheet.pot} onClose={close} />}
      {sheet?.kind === 'edit' &&
        (sheet.tx.type === 'move' ? (
          <MoveSheet existing={sheet.tx} onClose={close} />
        ) : (
          <EntrySheet type={sheet.tx.type} existing={sheet.tx} onClose={close} />
        ))}
    </main>
  )
}
