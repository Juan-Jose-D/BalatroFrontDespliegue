import type { JokerInstance } from '../../types/joker'
import { RARITY_COLORS, RARITY_NAMES } from '../../types/joker'
import './JokerCard.css'

interface JokerCardProps {
  readonly joker: JokerInstance
  readonly onClick?: () => void
  readonly size?: 'small' | 'medium' | 'large'
}

export default function JokerCard({ joker, onClick, size = 'medium' }: JokerCardProps) {
  const rarityColor = RARITY_COLORS[joker.rarity]
  const rarityName = RARITY_NAMES[joker.rarity]

  return (
    <button
      type="button"
      className={`joker-card joker-card-${size} joker-${joker.rarity}`}
      onClick={onClick}
      disabled={!onClick}
      style={{
        borderColor: rarityColor,
        cursor: onClick ? 'pointer' : 'default'
      }}
    >
      {/* Emoji/Icono */}
      <div 
        className="joker-emoji" 
        style={{ 
          background: `linear-gradient(135deg, ${rarityColor}33, ${rarityColor}11)` 
        }}
      >
        {joker.emoji || '🃏'}
      </div>

      {/* Nombre */}
      <div className="joker-name" style={{ color: rarityColor }}>
        {joker.name}
      </div>

      {/* Descripción */}
      <div className="joker-description">
        {joker.description}
      </div>

      {/* Rareza */}
      <div className="joker-rarity" style={{ color: rarityColor }}>
        {rarityName}
      </div>

      {/* Valor (compra/venta) */}
      {(joker.cost > 0 || joker.sellValue > 0) && (
        <div className="joker-value">
          {joker.cost > 0 && <span className="joker-cost">${joker.cost}</span>}
          {joker.sellValue > 0 && <span className="joker-sell">${joker.sellValue}</span>}
        </div>
      )}
    </button>
  )
}
