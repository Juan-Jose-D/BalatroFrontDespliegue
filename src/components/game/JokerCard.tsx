import type { JokerInstance } from '../../types/joker'
import { RARITY_COLORS, RARITY_NAMES } from '../../types/joker'
import './JokerCard.css'

interface JokerCardProps {
  readonly joker: JokerInstance
  readonly onClick?: () => void
  readonly size?: 'small' | 'medium' | 'large'
}

export default function JokerCard({ joker, onClick, size = 'medium' }: JokerCardProps) {
  const rarity = joker.rarity

  return (
    <div className='jokerDivPrincipal'>
      <button
        type="button"
        className={`jokerCard jokerCard${size.charAt(0).toUpperCase() + size.slice(1)} jokerRarity${rarity}`}
        onClick={onClick}
        disabled={!onClick}
      >
        <div className="jokerEmoji">
          {joker.emoji || '🃏'}
        </div>

        <div className="jokerName">
          {joker.name}
        </div>

        <div className="jokerDescription">
          {joker.description}
        </div>

        <div className="jokerRarity">
          {RARITY_NAMES[rarity]}
        </div>

        {(joker.cost > 0 || joker.sellValue > 0) && (
          <div className="jokerValue">
            {joker.cost > 0 && <span className="jokerCost">${joker.cost}</span>}
            {joker.sellValue > 0 && <span className="jokerSell">${joker.sellValue}</span>}
          </div>
        )}
      </button>
    </div>
  )
}
