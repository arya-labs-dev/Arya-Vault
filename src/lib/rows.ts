import { db, MOVES, type Transaction } from '../db'
import { POT_LABEL } from './money'

export type Row = { tx: Transaction; label: string; meta: string }

export async function getRows(limit?: number): Promise<Row[]> {
  let query = db.transactions.orderBy('createdAt').reverse()
  if (limit) query = query.limit(limit)
  const txs = await query.toArray()

  const cats = new Map((await db.categories.toArray()).map((c): [number, string] => [c.id, c.name]))
  const people = new Map((await db.people.toArray()).map((p): [number, string] => [p.id, p.name]))

  return txs.map((tx) => {
    if (tx.type === 'move') {
      return { tx, label: tx.moveKind ? MOVES[tx.moveKind].label : 'Move', meta: '' }
    }
    const label =
      (tx.type === 'out' ? cats.get(tx.categoryId ?? -1) : people.get(tx.personId ?? -1)) ??
      (tx.type === 'out' ? 'Out' : 'Cash in')
    return { tx, label, meta: [tx.pot ? POT_LABEL[tx.pot] : '', tx.eventTag].filter(Boolean).join(' · ') }
  })
}
