// Tipos para el sistema de Jokers

import type { Card } from './card'
import type { PokerHandType } from './poker'

/**
 * Rareza de los Jokers
 */
export type JokerRarity = 'common' | 'uncommon' | 'rare' | 'legendary'

/**
 * Tipos de efectos que puede tener un Joker
 */
export type JokerEffectType =
  | 'mult_flat'           // Añade multiplicador fijo
  | 'mult_conditional'    // Añade multiplicador bajo condición
  | 'chips_flat'          // Añade chips fijos
  | 'chips_conditional'   // Añade chips bajo condición
  | 'mult_per_card'       // Multiplicador por cada carta de un tipo
  | 'chips_per_card'      // Chips por cada carta de un tipo
  | 'mult_per_hand'       // Multiplicador que crece por mano jugada
  | 'retrigger'           // Vuelve a disparar efectos de cartas
  | 'special'             // Efecto especial único

/**
 * Condiciones para efectos condicionales
 */
export interface JokerCondition {
  type: 'hand_type' | 'suit' | 'rank' | 'card_count' | 'played_cards' | 'remaining_cards'
  handType?: PokerHandType
  stringValue?: string
  numberValue?: number
  operator?: '=' | '>' | '<' | '>=' | '<='
}

/**
 * Definición de un efecto de Joker
 */
export interface JokerEffect {
  type: JokerEffectType
  value: number                    // Valor del efecto (mult, chips, etc.)
  condition?: JokerCondition       // Condición para activar el efecto
  target?: 'all' | 'played' | 'held' // A qué cartas aplica
}

/**
 * Definición de un Joker
 */
export interface Joker {
  id: string
  name: string
  description: string
  rarity: JokerRarity
  effects: JokerEffect[]
  cost: number                     // Precio en la tienda
  sellValue: number                // Valor de venta
  
  // Visual
  emoji?: string                   // Emoji o icono
  color?: string                   // Color temático
  
  // Estado (para efectos que cambian con el tiempo)
  state?: Record<string, number>   // Estado interno (ej: contador de manos)
}

/**
 * Instancia de un Joker en el juego (puede tener estado)
 */
export interface JokerInstance extends Joker {
  instanceId: string               // ID único de esta instancia
  timesTriggered?: number          // Veces que se ha activado
}

/**
 * Colores por rareza
 */
export const RARITY_COLORS: Record<JokerRarity, string> = {
  common: '#a0a0a0',
  uncommon: '#4caf50',
  rare: '#2196f3',
  legendary: '#ff9800'
}

/**
 * Nombres de rareza en español
 */
export const RARITY_NAMES: Record<JokerRarity, string> = {
  common: 'Común',
  uncommon: 'Poco Común',
  rare: 'Raro',
  legendary: 'Legendario'
}

/**
 * Precios base por rareza
 */
export const RARITY_BASE_COST: Record<JokerRarity, number> = {
  common: 3,
  uncommon: 5,
  rare: 8,
  legendary: 12
}

/**
 * Resultado de aplicar efectos de Jokers
 */
export interface JokerEffectsResult {
  addedChips: number
  addedMult: number
  description: string[]            // Descripciones de qué Jokers se activaron
}

/**
 * Contexto para evaluar efectos de Jokers
 */
export interface JokerContext {
  handType: PokerHandType
  playedCards: Card[]
  heldCards: Card[]
  baseChips: number
  baseMult: number
  currentRound?: number
}
