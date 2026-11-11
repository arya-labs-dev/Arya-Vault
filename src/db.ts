import Dexie, { type EntityTable } from 'dexie'

// All money is stored as integer paise. Never floats.

export type TxType = 'in' | 'out' | 'move'
export type Pot = 'cash' | 'upi'
export type MoveKind = 'atm' | 'deposit' | 'to_groww' | 'from_groww'

// How each move shifts the pots (+1 adds, -1 removes, 0 untouched).
export const MOVES: Record<MoveKind, { label: string; cash: number; upi: number }> = {
  atm: { label: 'ATM withdrawal', cash: 1, upi: -1 },
  deposit: { label: 'Cash deposit', cash: -1, upi: 1 },
  to_groww: { label: 'To Groww', cash: 0, upi: -1 },
  from_groww: { label: 'From Groww', cash: 0, upi: 1 },
}

export interface Category {
  id: number
  name: string
  color: string
  isCustom: boolean
  sortOrder: number
}

export interface Person {
  id: number
  name: string
}

export interface Transaction {
  id: number
  type: TxType
  pot?: Pot // in/out only
  moveKind?: MoveKind // move only
  amountPaise: number
  categoryId?: number // out
  personId?: number // in: who gave you the money
  eventTag?: string
  note?: string
  createdAt: number
}

// Someone chipping in toward a bill you paid (Split bill).
// receivedAt undefined = still pending (owed to you).
export interface Contribution {
  id: number
  transactionId: number
  personId: number
  pot: Pot
  amountPaise: number
  receivedAt?: number
}

// A balance check for one pot. gap = countedPaise - expectedPaise.
export interface Count {
  id: number
  pot: Pot
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
  counts: EntityTable<Count, 'id'>
}

db.version(1).stores({
  categories: '++id, sortOrder',
  people: '++id, name',
  transactions: '++id, type, pot, categoryId, personId, eventTag, createdAt',
  contributions: '++id, transactionId, personId, receivedAt',
  counts: '++id, pot, createdAt',
})

const DEFAULT_CATEGORIES: [string, string][] = [
  ['Transport', '#f59e0b'],
  ['Food', '#ef4444'],
  ['Friends', '#ec4899'],
  ['Household', '#64748b'],
  ['Family', '#a855f7'],
  ['College', '#3b82f6'],
  ['Shopping', '#f97316'],
  ['Fun', '#14b8a6'],
  ['Recharge & Bills', '#0ea5e9'],
  ['Other', '#9ca3af'],
]

db.on('populate', (tx) => {
  tx.table('categories').bulkAdd(
    DEFAULT_CATEGORIES.map(([name, color], i) => ({
      name,
      color,
      isCustom: false,
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
type NewContribution = { personId: number; pot: Pot; amountPaise: number; received: boolean }

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
          pot: c.pot,
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
  return db.categories.add({ name, color, isCustom: true, sortOrder: total })
}

// ---------- reads ----------

// How much a transaction moves one pot (signed paise).
function delta(t: Transaction, pot: Pot): number {
  if (t.type === 'move') {
    return t.moveKind ? MOVES[t.moveKind][pot] * t.amountPaise : 0
  }
  if (t.pot !== pot) return 0
  return t.type === 'in' ? t.amountPaise : -t.amountPaise
}

// Balance = last count of that pot + everything that moved it since.
export async function getBalance(pot: Pot): Promise<number> {
  const counts = await db.counts.where('pot').equals(pot).sortBy('createdAt')
  const last = counts[counts.length - 1]
  const since = last?.createdAt ?? 0
  let balance = last?.countedPaise ?? 0

  const txs = await db.transactions.where('createdAt').above(since).toArray()
  for (const t of txs) balance += delta(t, pot)

  // Contributions that arrived after the count are money in hand too.
  const received = await db.contributions.where('receivedAt').above(since).toArray()
  for (const c of received) if (c.pot === pot) balance += c.amountPaise

  return balance
}

// gap > 0: more than expected (kept change). gap < 0: money went missing.
// first = true when this is the very first count of that pot (just sets the base).
export async function recordCount(pot: Pot, countedPaise: number) {
  const hadCount = (await db.counts.where('pot').equals(pot).count()) > 0
  const expectedPaise = await getBalance(pot)
  await db.counts.add({ pot, countedPaise, expectedPaise, createdAt: Date.now() })
  return { gap: countedPaise - expectedPaise, first: !hadCount }
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
