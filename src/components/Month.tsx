import { useState, type CSSProperties } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { formatRupees } from '../lib/money'
import { getMonthSummary, type Line, type Mode } from '../lib/summary'

const MODES: { id: Mode; label: string }[] = [
  { id: 'categories', label: 'Categories' },
  { id: 'events', label: 'Events' },
  { id: 'weeks', label: 'Weeks' },
]

function Lines({ lines, total }: { lines: Line[]; total?: number }) {
  const max = Math.max(...lines.map((l) => l.paise), 1)
  return (
    <ul className="lines">
      {lines.map((l) => (
        <li
          key={l.key}
          style={{ '--w': `${Math.max((l.paise / max) * 100, 2)}%` } as CSSProperties}
        >
          <span>{l.label}</span>
          <span>
            {formatRupees(l.paise)}
            {total && total > 0 ? (
              <span className="pct">{Math.round((l.paise / total) * 100)}%</span>
            ) : null}
          </span>
        </li>
      ))}
    </ul>
  )
}

function unaccountedText(gap: number, counts: number): string {
  if (counts === 0) return 'No gap to show yet. Count your cash weekly and it shows up here.'
  const across = `across ${counts} count${counts > 1 ? 's' : ''}`
  if (gap === 0) return `Nothing went missing ${across}.`
  if (gap < 0) return `${formatRupees(-gap)} went missing ${across}.`
  return `${formatRupees(gap)} extra (kept change) ${across}.`
}

export function Month() {
  const now = new Date()
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() })
  const [mode, setMode] = useState<Mode>('categories')
  const s = useLiveQuery(() => getMonthSummary(ym.year, ym.month), [ym.year, ym.month])

  const isCurrent = ym.year === now.getFullYear() && ym.month === now.getMonth()
  const title = new Date(ym.year, ym.month, 1).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  function shift(by: number) {
    setYm(({ year, month }) => {
      const d = new Date(year, month + by, 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  if (!s) return <div className="month" />

  const lines = s.out[mode]
  const moved: Line[] = [
    { key: 'to', label: 'To Groww', paise: s.toGroww },
    { key: 'from', label: 'From Groww', paise: s.fromGroww },
  ].filter((l) => l.paise > 0)

  return (
    <div className="month">
      <div className="month-nav">
        <button type="button" aria-label="Previous month" onClick={() => shift(-1)}>
          ‹
        </button>
        <span>{title}</span>
        <button type="button" aria-label="Next month" disabled={isCurrent} onClick={() => shift(1)}>
          ›
        </button>
      </div>

      <section className="spent">
        <h1>{formatRupees(s.totalOut)}</h1>
        <span>spent</span>
      </section>

      <div className="seg three">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={m.id === mode ? 'on' : ''}
            onClick={() => setMode(m.id)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {lines.length === 0 ? (
        <p className="note">Nothing spent this month.</p>
      ) : (
        <Lines lines={lines} total={mode === 'weeks' ? undefined : s.totalOut} />
      )}

      <h2>
        <span>Money in</span>
        <span>{formatRupees(s.totalIn)}</span>
      </h2>
      {s.inBySource.length === 0 ? (
        <p className="note">Nothing came in.</p>
      ) : (
        <Lines lines={s.inBySource} />
      )}

      <h2>
        <span>Unaccounted</span>
      </h2>
      <p className="note">{unaccountedText(s.unaccounted, s.countsThisMonth)}</p>

      {moved.length > 0 && (
        <>
          <h2>
            <span>Moved</span>
          </h2>
          <Lines lines={moved} />
        </>
      )}
    </div>
  )
}
