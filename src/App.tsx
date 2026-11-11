import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getBalance, MOVES, requestPersistence, type Pot, type TxType } from './db'
import { formatRupees, POT_LABEL } from './lib/money'
import { CountSheet } from './components/CountSheet'
import { EntrySheet } from './components/EntrySheet'
import { MoveSheet } from './components/MoveSheet'

type SheetState =
  | { kind: 'entry'; type: 'in' | 'out' }
  | { kind: 'move' }
  | { kind: 'count'; pot: Pot }
  | null

type Row = { id: number; type: TxType; amountPaise: number; label: string; meta: string }

async function getRecent(): Promise<Row[]> {
  const txs = await db.transactions.orderBy('createdAt').reverse().limit(6).toArray()
  const cats = new Map((await db.categories.toArray()).map((c): [number, string] => [c.id, c.name]))
  const people = new Map((await db.people.toArray()).map((p): [number, string] => [p.id, p.name]))

  return txs.map((t) => {
    if (t.type === 'move') {
      return {
        id: t.id,
        type: t.type,
        amountPaise: t.amountPaise,
        label: t.moveKind ? MOVES[t.moveKind].label : 'Move',
        meta: '',
      }
    }
    const label =
      (t.type === 'out' ? cats.get(t.categoryId ?? -1) : people.get(t.personId ?? -1)) ??
      (t.type === 'out' ? 'Out' : 'Cash in')
    return {
      id: t.id,
      type: t.type,
      amountPaise: t.amountPaise,
      label,
      meta: t.pot ? POT_LABEL[t.pot] : '',
    }
  })
}

export default function App() {
  const [sheet, setSheet] = useState<SheetState>(null)
  const cash = useLiveQuery(() => getBalance('cash'), [], 0)
  const upi = useLiveQuery(() => getBalance('upi'), [], 0)
  const recent: Row[] = useLiveQuery(() => getRecent(), [], [])

  useEffect(() => {
    void requestPersistence()
  }, [])

  const close = () => setSheet(null)

  return (
    <main className="home">
      <div className="brand">Arya Vault</div>

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
          <li key={r.id}>
            <span>
              {r.label}
              {r.meta && <span className="meta">{r.meta}</span>}
            </span>
            <span className={r.type === 'in' ? 'in' : ''}>
              {r.type === 'in' ? '+' : r.type === 'out' ? '-' : ''}
              {formatRupees(r.amountPaise)}
            </span>
          </li>
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

      {sheet?.kind === 'entry' && <EntrySheet type={sheet.type} onClose={close} />}
      {sheet?.kind === 'move' && <MoveSheet onClose={close} />}
      {sheet?.kind === 'count' && <CountSheet pot={sheet.pot} onClose={close} />}
    </main>
  )
}
