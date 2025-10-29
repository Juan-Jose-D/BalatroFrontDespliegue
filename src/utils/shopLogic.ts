// Utilidades para generar contenido de la tienda

import type { ShopItem, CardEnhancement } from '../types/shop'
import { SHOP_CONSTANTS, CARD_ENHANCEMENTS, getShopConfig } from '../types/shop'
import { getRandomJoker } from '../data/jokers'

/**
 * Genera items para la tienda
 */
export function generateShopItems(ante: number): ShopItem[] {
  const items: ShopItem[] = []
  const config = getShopConfig(ante)
  
  // Generar Jokers
  for (let i = 0; i < SHOP_CONSTANTS.JOKER_SLOTS; i++) {
    const joker = getRandomJoker(config.jokerRarityWeights)
    items.push({
      id: `joker-${Date.now()}-${i}`,
      type: 'joker',
      cost: joker.cost,
      joker
    })
  }
  
  // Generar mejoras de cartas
  if (Math.random() < config.enhancementChance) {
    for (let i = 0; i < SHOP_CONSTANTS.ENHANCEMENT_SLOTS; i++) {
      const enhancementTypes = Object.keys(CARD_ENHANCEMENTS) as CardEnhancement[]
      const randomType = enhancementTypes[Math.floor(Math.random() * enhancementTypes.length)]
      const enhancement = CARD_ENHANCEMENTS[randomType]
      
      items.push({
        id: `enhancement-${Date.now()}-${i}`,
        type: 'card_enhancement',
        cost: enhancement.cost,
        enhancement
      })
    }
  }
  
  return items
}

/**
 * Calcula el costo de reroll actual
 */
export function calculateRerollCost(rerollCount: number): number {
  return SHOP_CONSTANTS.BASE_REROLL_COST + (rerollCount * SHOP_CONSTANTS.REROLL_INCREMENT)
}

/**
 * Calcula intereses ganados basado en dinero actual
 */
export function calculateInterest(money: number): number {
  const interest = Math.floor(money / 5)
  return Math.min(interest, 5) // Máximo $5 de interés
}
