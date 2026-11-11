import { useState } from 'react'
import { addTransaction, MOVES, type MoveKind } from '../db'
import { toPaise } from '../lib/money'
import { useAmount } from '../lib/useAmount'
import { Numpad } from './Numpad'
import { Amount, Sheet } from './Sheet'

const KINDS = Object.keys(MOVES) as MoveKind[]

export function MoveSheet({ onClose }: { onClose: () => void }) {
  const { amount, press } = useAmount()
  const [kind, setKind] = useState<MoveKind>()

  async function save() {
    if (kind === undefined || amount <= 0) return
    await addTransaction({ type: 'move', moveKind: kind, amountPaise: toPaise(amount) })
    onClose()
  }

  return (
    <Sheet title="Move money (not spent, not earned)" onClose={onClose}>
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
    </Sheet>
  )
}
