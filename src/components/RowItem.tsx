import { formatRupees } from '../lib/money'
import type { Row } from '../lib/rows'

export function RowItem({ row, onClick }: { row: Row; onClick: () => void }) {
  const { tx } = row
  const sign = tx.type === 'in' ? '+' : tx.type === 'out' ? '-' : ''
  return (
    <li>
      <button type="button" className="row" onClick={onClick}>
        <span>
          {row.label}
          {row.meta && <span className="meta">{row.meta}</span>}
        </span>
        <span className={tx.type === 'in' ? 'in' : ''}>
          {sign}
          {formatRupees(tx.amountPaise)}
        </span>
      </button>
    </li>
  )
}
