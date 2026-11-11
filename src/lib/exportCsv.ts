import { db } from '../db'

// stop spreadsheet apps from running cells that start with = + - @ as formulas
function cell(v: string | number | undefined): string {
  let s = v === undefined ? '' : String(v)
  if (/^[=+\-@]/.test(s) && typeof v === 'string') s = "'" + s
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s
}

export async function exportCsv(): Promise<number> {
  const [txs, cats, people] = await Promise.all([
    db.transactions.orderBy('createdAt').toArray(),
    db.categories.toArray(),
    db.people.toArray(),
  ])
  const catName = new Map(cats.map((c) => [c.id, c.name]))
  const personName = new Map(people.map((p) => [p.id, p.name]))

  const rows = [['Date', 'Time', 'Type', 'Pot', 'Move', 'Amount (INR)', 'Category', 'Person', 'Event', 'Note']]
  for (const t of txs) {
    const d = new Date(t.createdAt)
    rows.push([
      d.toLocaleDateString('en-CA'),
      d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      t.type,
      t.pot ?? '',
      t.moveKind ?? '',
      (t.amountPaise / 100).toFixed(2),
      t.categoryId !== undefined ? (catName.get(t.categoryId) ?? '') : '',
      t.type === 'in' ? (t.personId !== undefined ? (personName.get(t.personId) ?? '') : 'Other') : '',
      t.eventTag ?? '',
      t.note ?? '',
    ])
  }

  const csv = '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `arya-vault-${new Date().toLocaleDateString('en-CA')}.csv`
  a.click()
  URL.revokeObjectURL(url)
  return txs.length
}
