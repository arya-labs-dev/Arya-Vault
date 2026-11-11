import { useState } from 'react'
import {
  addTransaction,
  deleteTransaction,
  MOVES,
  updateTransaction,
  type MoveKind,
  type Transaction,
} from '../db'
import { toPaise } from '../lib/money'
import { useAmount } from '../lib/useAmount'
import { Numpad } from './Numpad'
import { Amount, DeleteButton, Sheet } from './Sheet'

const KINDS = Object.keys(MOVES) as MoveKind[]

export function MoveSheet({ existing, onClose }: { existing?: Transaction; onClose: () => void }) {
  const { amount, press } = useAmount(existing ? Math.round(existing.amountPaise / 100) : 0)
  const [kind, setKind] = useState<MoveKind | undefined>(existing?.moveKind)

  async function save() {
    if (kind === undefined || amount <= 0) return
    const amountPaise = toPaise(amount)
    if (existing) await updateTransaction(existing.id, { moveKind: kind, amountPaise })
    else await addTransaction({ type: 'move', moveKind: kind, amountPaise })
    onClose()
  }

  async function remove() {
    if (!existing) return
    await deleteTransaction(existing.id)
    onClose()
  }

  return (
    <Sheet title={existing ? 'Edit move' : 'Move money (not spent, not earned)'} onClose={onClose}>
      <Amount rupees={amount} />

      <div className="chips">
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            className={k === kind ? 'chip on' : 'chip'}
            onClick={() => setKind(k)}
          >
            {MOVES[k].label}
          </button>
        ))}
      </div>

      <Numpad onPress={press} />

      <button
        type="button"
        className="save"
        disabled={amount <= 0 || kind === undefined}
        onClick={save}
      >
        Save
      </button>
      {existing && <DeleteButton onDelete={remove} />}
    </Sheet>
  )
}
