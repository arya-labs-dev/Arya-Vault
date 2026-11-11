import { formatRupees, POT_LABEL } from '../lib/money'
import type { Row } from '../lib/rows'

export function RowItem({ row, onClick }: { row: Row; onClick: () => void }) {
  const { tx } = row
  const sign = tx.type === 'in' ? '+' : tx.type === 'out' ? '-' : ''
  const kind = tx.type === 'move' ? 'move' : (tx.pot ?? 'cash')
  return (
    <li>
      <button type="button" className="row" onClick={onClick}>
        <span className={`dot ${kind}`} aria-hidden="true" />
        <span className="row-main">
          <span className="row-label">{row.label}</span>
          {row.tag && <span className="row-tag">{row.tag}</span>}
        </span>
        <span className={tx.type === 'in' ? 'row-amt in' : 'row-amt'}>
          {sign}
          {formatRupees(tx.amountPaise)}
        </span>
        <span className="sr">{tx.type === 'move' ? 'Move' : POT_LABEL[kind as 'cash' | 'upi']}</span>
      </button>
    </li>
  )
}
