// Tipos para el sistema de tienda

import type { Joker } from './joker'

/**
 * Tipos de items disponibles en la tienda
 */
export type ShopItemType = 'joker' | 'card_enhancement' | 'voucher' | 'pack'

/**
 * Mejoras disponibles para cartas
 */
export type CardEnhancement = 'bonus' | 'mult' | 'wild' | 'glass' | 'steel' | 'stone' | 'gold' | 'lucky'

/**
 * Ediciones especiales para cartas
 */
export type CardEdition = 'base' | 'foil' | 'holographic' | 'polychrome'

/**
 * Item de mejora de carta en la tienda
 */
export interface CardEnhancementItem {
  type: CardEnhancement
  name: string
  description: string
  cost: number
  effect: {
    bonus?: number
    mult?: number
  }
  color: string
}

/**
 * Item genérico de la tienda
 */
export interface ShopItem {
  id: string
  type: ShopItemType
  cost: number
  
  // Para Jokers
  joker?: Joker
  
  // Para mejoras de cartas
  enhancement?: CardEnhancementItem
  
  // Para paquetes (Fase futura)
  pack?: {
    name: string
    cards: number
    description: string
  }
}

/**
 * Estado de la tienda
 */
export interface ShopState {
  items: ShopItem[]
  rerollCost: number
  rerollCount: number
  isOpen: boolean
}

/**
 * Constantes de la tienda
 */
export const SHOP_CONSTANTS = {
  // Número de items por tipo
  JOKER_SLOTS: 2,
  ENHANCEMENT_SLOTS: 2,
  
  // Costos
  BASE_REROLL_COST: 5,
  REROLL_INCREMENT: 2,
  
  // Límites
  MAX_REROLLS_PER_ROUND: 5
} as const

/**
 * Definición de mejoras de cartas disponibles
 */
export const CARD_ENHANCEMENTS: Record<CardEnhancement, CardEnhancementItem> = {
  bonus: {
    type: 'bonus',
    name: 'Bonus',
    description: '+30 Chips',
    cost: 6,
    effect: { bonus: 30 },
    color: '#4caf50'
  },
  mult: {
    type: 'mult',
    name: 'Multiplicador',
    description: '+4 Mult',
    cost: 6,
    effect: { mult: 4 },
    color: '#f44336'
  },
  wild: {
    type: 'wild',
    name: 'Comodín',
    description: 'Puede ser cualquier palo',
    cost: 8,
    effect: {},
    color: '#9c27b0'
  },
  glass: {
    type: 'glass',
    name: 'Cristal',
    description: 'x2 Mult pero puede romperse',
    cost: 8,
    effect: { mult: 2 },
    color: '#00bcd4'
  },
  steel: {
    type: 'steel',
    name: 'Acero',
    description: 'x1.5 Mult permanente',
    cost: 8,
    effect: { mult: 1.5 },
    color: '#607d8b'
  },
  stone: {
    type: 'stone',
    name: 'Piedra',
    description: '+50 Chips sin puntaje de rango',
    cost: 7,
    effect: { bonus: 50 },
    color: '#795548'
  },
  gold: {
    type: 'gold',
    name: 'Oro',
    description: '+$3 al final de la ronda',
    cost: 10,
    effect: {},
    color: '#ffd700'
  },
  lucky: {
    type: 'lucky',
    name: 'Suerte',
    description: '1/5 probabilidad de +20 Mult',
    cost: 7,
    effect: {},
    color: '#8bc34a'
  }
}

/**
 * Valores de ediciones de cartas
 */
export const CARD_EDITIONS: Record<CardEdition, { name: string; cost: number; effect: string }> = {
  base: {
    name: 'Base',
    cost: 0,
    effect: 'Sin efectos'
  },
  foil: {
    name: 'Foil',
    cost: 4,
    effect: '+50 Chips'
  },
  holographic: {
    name: 'Holográfico',
    cost: 6,
    effect: '+10 Mult'
  },
  polychrome: {
    name: 'Policromo',
    cost: 10,
    effect: 'x1.5 Mult'
  }
}

/**
 * Configuración de generación de tienda por ante
 */
export function getShopConfig(ante: number): {
  jokerRarityWeights: Record<string, number>
  enhancementChance: number
} {
  // A mayor ante, mayor probabilidad de items raros
  const rarityBoost = Math.min(ante * 0.05, 0.25)
  
  return {
    jokerRarityWeights: {
      common: Math.max(0.5 - rarityBoost, 0.3),
      uncommon: 0.3 + rarityBoost * 0.5,
      rare: 0.15 + rarityBoost * 0.3,
      legendary: 0.05 + rarityBoost * 0.2
    },
    enhancementChance: 0.7 + (ante * 0.03) // Mayor probabilidad de mejoras en antes altos
  }
}
