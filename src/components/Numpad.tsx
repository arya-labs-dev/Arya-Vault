const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', '⌫']

export function Numpad({ onPress }: { onPress: (key: string) => void }) {
  return (
    <div className="numpad">
      {KEYS.map((k) => (
        <button
          key={k}
          type="button"
          aria-label={k === '⌫' ? 'Backspace' : k}
          onClick={() => onPress(k)}
        >
          {k}
        </button>
      ))}
    </div>
  )
}
