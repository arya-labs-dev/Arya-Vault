import type { Pot } from '../db'

const KEY = 'arya-vault:lastPot'

export function getLastPot(): Pot {
  try {
    return localStorage.getItem(KEY) === 'upi' ? 'upi' : 'cash'
  } catch {
    return 'cash'
  }
}

export function setLastPot(pot: Pot): void {
  try {
    localStorage.setItem(KEY, pot)
  } catch {
    // storage unavailable: the toggle just won't be remembered
  }
}
