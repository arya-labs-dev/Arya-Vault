import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addTransaction, db, type Category, type Person, type Pot } from '../db'
import { toPaise } from '../lib/money'
import { getLastPot, setLastPot } from '../lib/prefs'
import { useAmount } from '../lib/useAmount'
import { Numpad } from './Numpad'
import { Amount, PotToggle, Sheet } from './Sheet'

type Props = { type: 'in' | 'out'; onClose: () => void }

export function EntrySheet({ type, onClose }: Props) {
  const { amount, press } = useAmount()
  const [pot, setPot] = useState<Pot>(getLastPot)
  const [pickedId, setPickedId] = useState<number>()

  const categories: Category[] = useLiveQuery(
    () => db.categories.orderBy('sortOrder').toArray(),
    [],
    [],
  )
  const people: Person[] = useLiveQuery(() => db.people.toArray(), [], [])

  // id 0 = "Other" for money in (no specific person)
  const chips =
    type === 'out'
      ? categories.map((c) => ({ id: c.id, name: c.name }))
      : [...people.map((p) => ({ id: p.id, name: p.name })), { id: 0, name: 'Other' }]

  const canSave = amount > 0 && pickedId !== undefined

  async function save() {
    if (!canSave) return
    setLastPot(pot)
    await addTransaction({
      type,
      pot,
      amountPaise: toPaise(amount),
      ...(type === 'out' ? { categoryId: pickedId } : pickedId ? { personId: pickedId } : {}),
    })
    onClose()
  }

  return (
    <Sheet title={type === 'in' ? 'Money in' : 'Money out'} onClose={onClose}>
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

      <Numpad onPress={press} />

      <button type="button" className="save" disabled={!canSave} onClick={save}>
        Save
      </button>
    </Sheet>
  )
}
