import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getBalance, recordCount, type Pot } from '../db'
import { formatRupees, POT_LABEL, toPaise } from '../lib/money'
import { useAmount } from '../lib/useAmount'
import { Numpad } from './Numpad'
import { Amount, Sheet } from './Sheet'

type Result = { gap: number; first: boolean; counted: number }

function message(pot: Pot, r: Result): string {
  if (r.first) return `${POT_LABEL[pot]} set to ${formatRupees(r.counted)}.`
  if (pot === 'upi') return `UPI updated. It was off by ${formatRupees(Math.abs(r.gap))}.`
  if (r.gap === 0) return 'Spot on. Nothing went missing.'
  if (r.gap > 0) return `${formatRupees(r.gap)} more than expected. Kept change?`
  return `${formatRupees(-r.gap)} less than expected. That's your leak.`
}

export function CountSheet({ pot, onClose }: { pot: Pot; onClose: () => void }) {
  const { amount, press } = useAmount()
  const expected = useLiveQuery(() => getBalance(pot), [pot], 0)
  const [result, setResult] = useState<Result>()

  async function save() {
    const counted = toPaise(amount)
    const r = await recordCount(pot, counted)
    setResult({ ...r, counted })
  }

  const title = pot === 'cash' ? 'Count your cash' : 'Set UPI balance'

  if (result) {
    return (
      <Sheet title={title} pot={pot} onClose={onClose}>
        <p className="result">{message(pot, result)}</p>
        <button type="button" className="save" onClick={onClose}>
          Done
        </button>
      </Sheet>
    )
  }

  return (
    <Sheet title={title} pot={pot} onClose={onClose}>
      <Amount rupees={amount} />
      <p className="hint">App thinks: {formatRupees(expected)}</p>
      <Numpad onPress={press} />
      <button type="button" className="save" onClick={save}>
        Save
      </button>
    </Sheet>
  )
}
