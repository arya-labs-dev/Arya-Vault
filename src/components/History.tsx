import { useLiveQuery } from 'dexie-react-hooks'
import type { Transaction } from '../db'
import { getRows, type Row } from '../lib/rows'
import { RowItem } from './RowItem'

function dayLabel(ts: number): string {
  const d = new Date(ts)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function History({ onSelect }: { onSelect: (tx: Transaction) => void }) {
  const rows: Row[] = useLiveQuery(() => getRows(), [], [])

  const groups: { label: string; rows: Row[] }[] = []
  for (const r of rows) {
    const label = dayLabel(r.tx.createdAt)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.rows.push(r)
    else groups.push({ label, rows: [r] })
  }

  return (
    <div className="history">
      {groups.length === 0 && <p className="hint">Nothing logged yet.</p>}
      {groups.map((g) => (
        <section key={g.label}>
          <h2>{g.label}</h2>
          <ul className="list">
            {g.rows.map((r) => (
              <RowItem key={r.tx.id} row={r} onClick={() => onSelect(r.tx)} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
