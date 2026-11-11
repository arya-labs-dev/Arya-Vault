import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getBalance, requestPersistence, type Pot, type Transaction } from './db'
import { formatRupees } from './lib/money'
import { getRows, type Row } from './lib/rows'
import { CountSheet } from './components/CountSheet'
import { EntrySheet } from './components/EntrySheet'
import { History } from './components/History'
import { MoveSheet } from './components/MoveSheet'
import { Month } from './components/Month'
import { RowItem } from './components/RowItem'

type Tab = 'home' | 'history' | 'month'
type SheetState =
  | { kind: 'entry'; type: 'in' | 'out' }
  | { kind: 'move' }
  | { kind: 'count'; pot: Pot }
  | { kind: 'edit'; tx: Transaction }
  | null

const TABS: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'history', label: 'History' },
  { id: 'month', label: 'Month' },
]

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
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={tab === t.id ? 'on' : ''}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      {tab === 'home' && (
        <>
          <section className="pots">
            <button type="button" className="pot cash" onClick={() => setSheet({ kind: 'count', pot: 'cash' })}>
              <span className="pot-name">Cash</span>
              <span className="pot-hint">Count it</span>
              <strong>{formatRupees(cash)}</strong>
            </button>
            <button type="button" className="pot upi" onClick={() => setSheet({ kind: 'count', pot: 'upi' })}>
              <span className="pot-name">UPI</span>
              <span className="pot-hint">Set balance</span>
              <strong>{formatRupees(upi)}</strong>
            </button>
          </section>
          <p className="total">
            Total <b>{formatRupees(cash + upi)}</b>
          </p>

          <ul className="recent">
            {recent.length === 0 && <li className="empty">Nothing yet. Log your first one below.</li>}
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
      )}
      {tab === 'history' && <History onSelect={edit} />}
      {tab === 'month' && <Month />}

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
