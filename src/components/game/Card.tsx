import type { Card as CardType } from '../../types/card'
import { SUIT_SYMBOLS, SUIT_COLORS } from '../../types/card'

interface CardProps {
  readonly card: CardType
  readonly onClick?: () => void
  readonly faceDown?: boolean
  readonly disabled?: boolean
}

export default function Card({
  card,
  onClick,
  faceDown = false,
  disabled = false
}: CardProps) {
  const color = SUIT_COLORS[card.suit]
  const symbol = SUIT_SYMBOLS[card.suit]

  const handleClick = () => {
    if (!disabled && onClick) {
      onClick()
    }
  }

  if (faceDown) {
    return (
      <button 
        type="button"
        className="card card-back" 
        onClick={handleClick}
        disabled={disabled}
      >
        <div className="card-pattern"></div>
      </button>
    )
  }

  const editionClass = card.edition ? `card-edition-${card.edition}` : ''

  return (
    <button
      type="button"
      className={`
        card
        card-face
        ${card.selected ? 'card-selected' : ''}
        ${disabled ? 'card-disabled' : ''}
        ${editionClass}
      `}
      onClick={handleClick}
      disabled={disabled}
      data-color={color}
    >
      {/* Efecto de edición */}
      {card.edition && (
        <div className={`card-edition-effect card-edition-effect-${card.edition}`}></div>
      )}

      {/* Valor superior izquierda */}
      <div className="card-corner card-corner-top">
        <div className="card-rank">{card.rank}</div>
        <div className="card-suit">{symbol}</div>
      </div>

      {/* Símbolo central */}
      <div className="card-center">
        <span className="card-suit-large">{symbol}</span>
      </div>

      {/* Valor inferior derecha (invertido) */}
      <div className="card-corner card-corner-bottom">
        <div className="card-rank">{card.rank}</div>
        <div className="card-suit">{symbol}</div>
      </div>

      {/* Indicador de mejoras */}
      {card.enhancement && (
        <div className="card-enhancement" data-enhancement={card.enhancement}>
          {getEnhancementIcon(card.enhancement)}
        </div>
      )}

      {/* Indicador de selección */}
      {card.selected && (
        <div className="card-selected-indicator"></div>
      )}
    </button>
  )
}

function getEnhancementIcon(enhancement: string): string {
  const icons: Record<string, string> = {
    bonus: '★',
    mult: '✕',
    wild: '?',
    glass: '◇',
    steel: '▣',
    stone: '●',
    gold: '$',
    lucky: '♣'
  }
  return icons[enhancement] || '★'
}
