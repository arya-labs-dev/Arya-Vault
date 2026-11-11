import { useState, type ReactNode } from 'react'
import type { Pot } from '../db'
import { formatRupees, POT_LABEL, toPaise } from '../lib/money'

export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <span>{title}</span>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Amount({ rupees }: { rupees: number }) {
  return (
    <div className={rupees === 0 ? 'amount zero' : 'amount'}>{formatRupees(toPaise(rupees))}</div>
  )
}

export function PotToggle({ value, onChange }: { value: Pot; onChange: (p: Pot) => void }) {
  return (
    <div className="seg">
      {(['cash', 'upi'] as const).map((p) => (
        <button
          key={p}
          type="button"
          className={p === value ? 'on' : ''}
          onClick={() => onChange(p)}
        >
          {POT_LABEL[p]}
        </button>
      ))}
    </div>
  )
}

export function DeleteButton({ onDelete }: { onDelete: () => void | Promise<void> }) {
  const [sure, setSure] = useState(false)
  return (
    <button
      type="button"
      className="danger"
      onClick={() => {
        if (sure) void onDelete()
        else setSure(true)
      }}
    >
      {sure ? 'Tap again to delete' : 'Delete'}
    </button>
  )
}
