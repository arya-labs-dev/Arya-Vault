import { db } from '../db'

export type Mode = 'categories' | 'events' | 'weeks'
export type Line = { key: string; label: string; paise: number }

export type MonthSummary = {
  totalIn: number
  inBySource: Line[]
  totalOut: number // your real spend (minus what others chipped in)
  out: Record<Mode, Line[]>
  toGroww: number
  fromGroww: number
  unaccounted: number // sum of cash count gaps; negative = went missing
  countsThisMonth: number
}

function add(map: Map<string, Line>, key: string, label: string, paise: number) {
  const cur = map.get(key)
  if (cur) cur.paise += paise
  else map.set(key, { key, label, paise })
}

const byAmount = (a: Line, b: Line) => b.paise - a.paise

function weekStart(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday
  return d.getTime()
}

function weekLabel(start: number): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  return `${fmt(new Date(start))} – ${fmt(end)}`
}

// month is 0-based (0 = January), like JS Date.
export async function getMonthSummary(year: number, month: number): Promise<MonthSummary> {
  const start = new Date(year, month, 1).getTime()
  const end = new Date(year, month + 1, 1).getTime()

  const txs = await db.transactions.where('createdAt').between(start, end, true, false).toArray()
  const cats = new Map((await db.categories.toArray()).map((c): [number, string] => [c.id, c.name]))
  const people = new Map((await db.people.toArray()).map((p): [number, string] => [p.id, p.name]))

  const contribs = await db.contributions
    .where('transactionId')
    .anyOf(txs.map((t) => t.id))
    .toArray()
  const chipped = new Map<number, number>()
  for (const c of contribs) {
    chipped.set(c.transactionId, (chipped.get(c.transactionId) ?? 0) + c.amountPaise)
  }

  const inMap = new Map<string, Line>()
  const catMap = new Map<string, Line>()
  const eventMap = new Map<string, Line>()
  const weekMap = new Map<string, Line>()
  let totalIn = 0
  let totalOut = 0
  let toGroww = 0
  let fromGroww = 0

  for (const t of txs) {
    if (t.type === 'move') {
      if (t.moveKind === 'to_groww') toGroww += t.amountPaise
      if (t.moveKind === 'from_groww') fromGroww += t.amountPaise
      continue
    }
    if (t.type === 'in') {
      totalIn += t.amountPaise
      const name = people.get(t.personId ?? -1) ?? 'Other'
      add(inMap, name, name, t.amountPaise)
      continue
    }
    const net = t.amountPaise - (chipped.get(t.id) ?? 0)
    totalOut += net
    const cat = cats.get(t.categoryId ?? -1) ?? 'Other'
    add(catMap, cat, cat, net)
    const tag = t.eventTag ?? 'Everyday'
    add(eventMap, tag, tag, net)
    const ws = weekStart(t.createdAt)
    add(weekMap, String(ws), weekLabel(ws), net)
  }

  // Cash count gaps. The very first count only sets the base, so it's skipped.
  const cashCounts = await db.counts.where('pot').equals('cash').sortBy('createdAt')
  let unaccounted = 0
  let countsThisMonth = 0
  cashCounts.forEach((c, i) => {
    if (i > 0 && c.createdAt >= start && c.createdAt < end) {
      unaccounted += c.countedPaise - c.expectedPaise
      countsThisMonth += 1
    }
  })

  return {
    totalIn,
    inBySource: [...inMap.values()].sort(byAmount),
    totalOut,
    out: {
      categories: [...catMap.values()].sort(byAmount),
      events: [...eventMap.values()].sort(byAmount),
      weeks: [...weekMap.values()].sort((a, b) => Number(a.key) - Number(b.key)),
    },
    toGroww,
    fromGroww,
    unaccounted,
    countsThisMonth,
  }
}
