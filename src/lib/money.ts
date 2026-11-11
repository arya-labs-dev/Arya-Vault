import type { Pot } from '../db'

const inr = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 })

export const toPaise = (rupees: number): number => Math.round(rupees * 100)

export function formatRupees(paise: number): string {
  const sign = paise < 0 ? '-' : ''
  return `${sign}₹${inr.format(Math.abs(paise) / 100)}`
}

export const POT_LABEL: Record<Pot, string> = { cash: 'Cash', upi: 'UPI' }
