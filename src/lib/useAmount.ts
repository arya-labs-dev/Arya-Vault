import { useState } from 'react'

// Whole rupees typed on the numpad. Max 7 digits.
export function useAmount(initialRupees = 0) {
  const [digits, setDigits] = useState(initialRupees > 0 ? String(initialRupees) : '')

  function press(key: string) {
    if (key === '⌫') return setDigits((d) => d.slice(0, -1))
    setDigits((d) => (d + key).replace(/^0+/, '').slice(0, 7))
  }

  return { amount: Number(digits || 0), press }
}
