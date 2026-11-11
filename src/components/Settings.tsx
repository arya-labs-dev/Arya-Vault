import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

const PHRASE = 'reset'

export function Settings() {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const entries = useLiveQuery(() => db.transactions.count(), [], 0)
  const ready = typed.trim().toLowerCase() === PHRASE

  async function wipe() {
    if (!ready || busy) return
    setBusy(true)
    try {
      await db.delete()
      try {
        localStorage.clear()
      } catch {
        /* storage blocked, ignore */
      }
    } finally {
      location.reload()
    }
  }

  function cancel() {
    setOpen(false)
    setTyped('')
  }

  return (
    <section className="settings">
      <div className="danger">
        <h2>Reset everything</h2>
        <p>
          Permanently deletes all {entries} {entries === 1 ? 'entry' : 'entries'}, your balances and counts, custom
          categories and preferences. Everything lives only on this device, so this can't be undone.
        </p>

        {!open ? (
          <button type="button" className="danger-btn" onClick={() => setOpen(true)}>
            Reset everything
          </button>
        ) : (
          <>
            <label htmlFor="confirm-reset">
              Type <b>{PHRASE}</b> to confirm
            </label>
            <input
              id="confirm-reset"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              autoFocus
            />
            <button type="button" className="danger-btn solid" disabled={!ready || busy} onClick={wipe}>
              {busy ? 'Deleting…' : 'Delete everything'}
            </button>
            <button type="button" className="danger-ghost" onClick={cancel}>
              Cancel
            </button>
          </>
        )}
      </div>
    </section>
  )
}
