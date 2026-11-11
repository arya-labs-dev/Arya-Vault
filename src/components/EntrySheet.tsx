import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  addTransaction,
  db,
  deleteTransaction,
  getRecentTags,
  updateTransaction,
  type Category,
  type Person,
  type Pot,
  type Transaction,
} from '../db'
import { toPaise } from '../lib/money'
import { getLastPot, setLastPot } from '../lib/prefs'
import { useAmount } from '../lib/useAmount'
import { Numpad } from './Numpad'
import { Amount, DeleteButton, PotToggle, Sheet } from './Sheet'

type Props = { type: 'in' | 'out'; existing?: Transaction; onClose: () => void }

export function EntrySheet({ type, existing, onClose }: Props) {
  const { amount, press } = useAmount(existing ? Math.round(existing.amountPaise / 100) : 0)
  const [pot, setPot] = useState<Pot>(() => existing?.pot ?? getLastPot())
  const [pickedId, setPickedId] = useState<number | undefined>(
    existing ? (existing.type === 'out' ? existing.categoryId : (existing.personId ?? 0)) : undefined,
  )
  const [tag, setTag] = useState(existing?.eventTag ?? '')
  const [showMore, setShowMore] = useState(Boolean(existing?.eventTag))

  const categories: Category[] = useLiveQuery(
    () => db.categories.orderBy('sortOrder').toArray(),
    [],
    [],
  )
  const people: Person[] = useLiveQuery(() => db.people.toArray(), [], [])
  const recentTags: string[] = useLiveQuery(() => getRecentTags(), [], [])

  // id 0 = "Other" for money in (no specific person)
  const chips =
    type === 'out'
      ? categories.map((c) => ({ id: c.id, name: c.name }))
      : [...people.map((p) => ({ id: p.id, name: p.name })), { id: 0, name: 'Other' }]

  const canSave = amount > 0 && pickedId !== undefined

  async function save() {
    if (!canSave) return
    const amountPaise = toPaise(amount)
    const eventTag = tag.trim() || undefined
    if (existing) {
      await updateTransaction(
        existing.id,
        type === 'out'
          ? { pot, amountPaise, categoryId: pickedId, eventTag }
          : { pot, amountPaise, personId: pickedId || undefined },
      )
    } else {
      setLastPot(pot)
      await addTransaction({
        type,
        pot,
        amountPaise,
        ...(type === 'out'
          ? { categoryId: pickedId, eventTag }
          : pickedId
            ? { personId: pickedId }
            : {}),
      })
    }
    onClose()
  }

  async function remove() {
    if (!existing) return
    await deleteTransaction(existing.id)
    onClose()
  }

  const title = existing ? 'Edit entry' : type === 'in' ? 'Money in' : 'Money out'

  return (
    <Sheet title={title} pot={pot} onClose={onClose}>
      <PotToggle value={pot} onChange={setPot} />
      <Amount rupees={amount} />

      <div className="chips">
        {chips.map((c) => (
          <button
            key={c.id}
            type="button"
            className={c.id === pickedId ? 'chip on' : 'chip'}
            onClick={() => setPickedId(c.id)}
          >
            {c.name}
          </button>
        ))}
      </div>

      {type === 'out' &&
        (showMore ? (
          <div className="more">
            <input
              className="field"
              placeholder="Event (optional), e.g. Trip"
              value={tag}
              maxLength={40}
              onChange={(e) => setTag(e.target.value)}
            />
            <div className="chips">
              {recentTags
                .filter((t) => t !== tag)
                .map((t) => (
                  <button key={t} type="button" className="chip" onClick={() => setTag(t)}>
                    {t}
                  </button>
                ))}
            </div>
          </div>
        ) : (
          <button type="button" className="more-btn" onClick={() => setShowMore(true)}>
            + Event
          </button>
        ))}

      <Numpad onPress={press} />

      <button type="button" className="save" disabled={!canSave} onClick={save}>
        Save
      </button>
      {existing && <DeleteButton onDelete={remove} />}
    </Sheet>
  )
}
