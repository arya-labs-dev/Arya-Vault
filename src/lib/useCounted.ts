import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Pot } from '../db'

// true once the pot has at least one count; undefined while loading
export function useCounted(pot: Pot): boolean | undefined {
  return useLiveQuery(async () => (await db.counts.filter((c) => c.pot === pot).count()) > 0, [pot])
}
