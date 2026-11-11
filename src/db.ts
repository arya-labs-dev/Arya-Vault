import Dexie, { type EntityTable } from 'dexie'

// All money is stored as integer paise. Never floats.

export type TxType = 'in' | 'out'

export interface Category {
  id: number
  name: string
  color: string
  isCustom: boolean
  excludeFromSpend: boolean
  sortOrder: number
}

export interface Person {
  id: number
  name: string
}

export interface Transaction {
  id: number
  type: TxType
  amountPaise: number
  categoryId?: number // for 'out'
  personId?: number // for 'in': who gave you the money
  note?: string
  createdAt: number
}

// Someone chipping in toward a bill you paid (Split bill).
// receivedAt undefined = still pending (owed to you).
export interface Contribution {
  id: number
  transactionId: number
  personId: number
  amountPaise: number
  receivedAt?: number
}

// expectedPaise is what the app thought you had; gap = counted - expected.
export interface CashCount {
  id: number
  countedPaise: number
  expectedPaise: number
  createdAt: number
}

export const MAX_CUSTOM_CATEGORIES = 5

export const db = new Dexie('arya-vault') as Dexie & {
  categories: EntityTable<Category, 'id'>
  people: EntityTable<Person, 'id'>
  transactions: EntityTable<Transaction, 'id'>
  contributions: EntityTable<Contribution, 'id'>
  cashCounts: EntityTable<CashCount, 'id'>
}

db.version(1).stores({
  categories: '++id, sortOrder',
  people: '++id, name',
  transactions: '++id, type, categoryId, personId, createdAt',
  contributions: '++id, transactionId, personId, receivedAt',
  cashCounts: '++id, createdAt',
})

const DEFAULT_CATEGORIES: [string, string, boolean][] = [
  ['Transport', '#f59e0b', false],
  ['Food', '#ef4444', false],
  ['Snacks & Drinks', '#f97316', false],
  ['College', '#3b82f6', false],
  ['Family', '#a855f7', false],
  ['Shopping', '#ec4899', false],
  ['Fun', '#14b8a6', false],
  ['Recharge & Bills', '#64748b', false],
  ['Invested', '#22c55e', true], // moved, not spent
  ['Other', '#9ca3af', false],
]

db.on('populate', (tx) => {
  tx.table('categories').bulkAdd(
    DEFAULT_CATEGORIES.map(([name, color, excludeFromSpend], i) => ({
      name,
      color,
      isCustom: false,
      excludeFromSpend,
      sortOrder: i,
    })),
  )
  tx.table('people').bulkAdd([{ name: 'Dad' }, { name: 'Mom' }, { name: 'Sister' }])
})

// Ask the browser not to evict our data. Call once on first launch.
export async function requestPersistence(): Promise<boolean> {
  if (navigator.storage?.persist) return navigator.storage.persist()
  return false
}

// ---------- writes ----------

type NewTransaction = Omit<Transaction, 'id' | 'createdAt'> & { createdAt?: number }
type NewContribution = { personId: number; amountPaise: number; received: boolean }

export async function addTransaction(
  tx: NewTransaction,
  contributions: NewContribution[] = [],
): Promise<number> {
  return db.transaction('rw', db.transactions, db.contributions, async () => {
    const createdAt = tx.createdAt ?? Date.now()
    const id = await db.transactions.add({ ...tx, createdAt })
    if (contributions.length > 0) {
      await db.contributions.bulkAdd(
        contributions.map((c) => ({
          transactionId: id,
          personId: c.personId,
          amountPaise: c.amountPaise,
          receivedAt: c.received ? createdAt : undefined,
        })),
      )
    }
    return id
  })
}

export async function markContributionReceived(id: number): Promise<void> {
  await db.contributions.update(id, { receivedAt: Date.now() })
}

export async function addCustomCategory(name: string, color: string): Promise<number> {
  const customCount = await db.categories.filter((c) => c.isCustom).count()
  if (customCount >= MAX_CUSTOM_CATEGORIES) {
    throw new Error(`Max ${MAX_CUSTOM_CATEGORIES} custom categories`)
  }
  const total = await db.categories.count()
  return db.categories.add({
    name,
    color,
    isCustom: true,
    excludeFromSpend: false,
    sortOrder: total,
  })
}

// ---------- reads ----------

// Balance = last cash count + everything that moved after it.
export async function getBalance(): Promise<number> {
  const last = await db.cashCounts.orderBy('createdAt').last()
  const since = last?.createdAt ?? 0
  let balance = last?.countedPaise ?? 0

  const txs = await db.transactions.where('createdAt').above(since).toArray()
  for (const t of txs) balance += t.type === 'in' ? t.amountPaise : -t.amountPaise

  // Contributions that actually arrived after the count are cash in hand too.
  const received = await db.contributions.where('receivedAt').above(since).toArray()
  for (const c of received) balance += c.amountPaise

  return balance
}

// Returns the gap: positive = you have more than expected (kept change),
// negative = money went missing / unlogged spending.
export async function recordCashCount(countedPaise: number): Promise<number> {
  const expectedPaise = await getBalance()
  await db.cashCounts.add({ countedPaise, expectedPaise, createdAt: Date.now() })
  return countedPaise - expectedPaise
}

// Pending contributions grouped by person: who owes you what.
export async function getOwed(): Promise<{ personId: number; amountPaise: number }[]> {
  const pending = await db.contributions.filter((c) => c.receivedAt === undefined).toArray()
  const byPerson = new Map<number, number>()
  for (const c of pending) {
    byPerson.set(c.personId, (byPerson.get(c.personId) ?? 0) + c.amountPaise)
  }
  return [...byPerson].map(([personId, amountPaise]) => ({ personId, amountPaise }))
}

// month is 0-based (0 = January), like JS Date.
export async function getMonthSummary(year: number, month: number) {
  const start = new Date(year, month, 1).getTime()
  const end = new Date(year, month + 1, 1).getTime()

  const txs = await db.transactions.where('createdAt').between(start, end, true, false).toArray()
  const cats = await db.categories.toArray()
  const catById = new Map(cats.map((c) => [c.id, c]))

  const contribs = await db.contributions
    .where('transactionId')
    .anyOf(txs.map((t) => t.id))
    .toArray()
  const chippedIn = new Map<number, number>()
  for (const c of contribs) {
    chippedIn.set(c.transactionId, (chippedIn.get(c.transactionId) ?? 0) + c.amountPaise)
  }

  let totalIn = 0
  let totalSpent = 0 // your real spend: paid minus what others chipped in
  let totalInvested = 0
  const byCategory = new Map<number, number>()

  for (const t of txs) {
    if (t.type === 'in') {
      totalIn += t.amountPaise
      continue
    }
    const net = t.amountPaise - (chippedIn.get(t.id) ?? 0)
    const cat = t.categoryId !== undefined ? catById.get(t.categoryId) : undefined
    if (cat?.excludeFromSpend) {
      totalInvested += net
      continue
    }
    totalSpent += net
    if (t.categoryId !== undefined) {
      byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + net)
    }
  }

  return { totalIn, totalSpent, totalInvested, byCategory }
}
