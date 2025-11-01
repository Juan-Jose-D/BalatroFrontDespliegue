import { useState } from 'react'
import type { ShopItem } from '../types/shop'
import { generateShopItems, calculateRerollCost } from '../utils/shopLogic'
import JokerCard from './game/JokerCard'
import './Shop.css'

interface ShopProps {
  ante: number
  money: number
  onBuyItem: (item: ShopItem) => boolean
  onReroll: (cost: number) => boolean
  onSkip: () => void
}

export default function Shop({ ante, money, onBuyItem, onReroll, onSkip }: Readonly<ShopProps>) {
  const [items, setItems] = useState<ShopItem[]>(() => generateShopItems(ante))
  const [rerollCount, setRerollCount] = useState(0)
  const [purchasedItems, setPurchasedItems] = useState<Set<string>>(new Set())
  
  const rerollCost = calculateRerollCost(rerollCount)
  const canAffordReroll = money >= rerollCost

  const handleBuyItem = (item: ShopItem) => {
    if (purchasedItems.has(item.id)) return
    if (money < item.cost) return
    
    const success = onBuyItem(item)
    if (success) {
      setPurchasedItems(prev => new Set(prev).add(item.id))
    }
  }

  const handleReroll = () => {
    if (!canAffordReroll) return
    
    const success = onReroll(rerollCost)
    if (success) {
      setItems(generateShopItems(ante))
      setRerollCount(prev => prev + 1)
      setPurchasedItems(new Set())
    }
  }

  return (
    <div className="shop">
      <div className="shop-header">
        <h2>🛒 Tienda</h2>
        <div className="shop-money">💰 ${money}</div>
      </div>

      <div className="shop-items">
        {items.map(item => {
          const isPurchased = purchasedItems.has(item.id)
          const canAfford = money >= item.cost
          
          if (item.type === 'joker' && item.joker) {
            const jokerInstance = { ...item.joker, instanceId: item.id }
            return (
              <div key={item.id} className={`shop-item ${isPurchased ? 'purchased' : ''}`}>
                <JokerCard joker={jokerInstance} size="medium" />
                <button
                  className="buy-button"
                  onClick={() => handleBuyItem(item)}
                  disabled={isPurchased || !canAfford}
                >
                  {isPurchased ? '✓ Comprado' : `Comprar $${item.cost}`}
                </button>
              </div>
            )
          }
          
          if (item.type === 'card_enhancement' && item.enhancement) {
            const { enhancement } = item
            return (
              <div key={item.id} className={`shop-item ${isPurchased ? 'purchased' : ''}`}>
                <div className="enhancement-card">
                  <div className="enhancement-emoji">✨</div>
                  <div className="enhancement-name">{enhancement.name}</div>
                  <div className="enhancement-description">{enhancement.description}</div>
                </div>
                <button
                  className="buy-button"
                  onClick={() => handleBuyItem(item)}
                  disabled={isPurchased || !canAfford}
                >
                  {isPurchased ? '✓ Comprado' : `Comprar $${item.cost}`}
                </button>
              </div>
            )
          }
          
          return null
        })}
      </div>

      <div className="shop-actions">
        <button
          className="reroll-button"
          onClick={handleReroll}
          disabled={!canAffordReroll}
        >
          🔄 Reroll ${rerollCost}
        </button>
        <button className="skip-button" onClick={onSkip}>
          ⏭️ Continuar
        </button>
      </div>
    </div>
  )
}
