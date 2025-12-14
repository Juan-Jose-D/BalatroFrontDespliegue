import type { Card } from '../types/card'
import type { PokerHandType, HandScore } from '../types/poker'
import type { JokerInstance } from '../types/joker'
import { RANK_VALUES } from '../types/card'
import { POKER_HANDS } from '../types/poker'
import { applyJokerEffects } from './jokerEffects'
import { calculateAllCardEffects } from './cardEnhancements'

/**
 * Detecta el tipo de mano de poker de un conjunto de cartas
 * @param cards - Array de 5 cartas máximo
 */
export function detectPokerHand(cards: Card[]): PokerHandType {
  if (cards.length === 0) return 'high_card'
  if (cards.length > 5) {
    throw new Error('No se pueden evaluar más de 5 cartas')
  }

  // Si hay menos de 5 cartas, solo puede ser carta alta, pareja, trío, etc.
  // No puede ser flush ni straight (requieren exactamente 5 cartas)
  if (cards.length < 5) {
    // Ordenar cartas por valor descendente
    const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank])
    
    // Contar ocurrencias de cada rango
    const rankCounts = countRanks(sorted)
    const counts = Object.values(rankCounts).sort((a, b) => b - a)

    // Trío (3 iguales)
    if (counts[0] === 3) {
      return 'three_of_a_kind'
    }

    // Pareja
    if (counts[0] === 2) {
      return 'pair'
    }

    // Carta Alta
    return 'high_card'
  }

  // Para 5 cartas, verificar todas las combinaciones posibles
  // Ordenar cartas por valor descendente
  const sorted = [...cards].sort((a, b) => RANK_VALUES[b.rank] - RANK_VALUES[a.rank])

  // Verificar flush (EXACTAMENTE 5 cartas del mismo palo)
  const isFlush = cards.length === 5 && cards.every(card => card.suit === cards[0].suit)
  
  // Verificar straight (EXACTAMENTE 5 cartas en secuencia)
  const isStraight = checkStraight(sorted)
  
  // Contar ocurrencias de cada rango
  const rankCounts = countRanks(sorted)
  const counts = Object.values(rankCounts).sort((a, b) => b - a)

  // Escalera Real (10-J-Q-K-A del mismo palo)
  if (isFlush && isStraight && sorted[0].rank === 'A' && sorted[1].rank === 'K') {
    return 'royal_flush'
  }

  // Escalera de Color (5 cartas del mismo palo en secuencia)
  if (isFlush && isStraight) {
    return 'straight_flush'
  }

  // Poker (4 iguales)
  if (counts[0] === 4) {
    return 'four_of_a_kind'
  }

  // Full House (3 iguales + 2 iguales)
  if (counts[0] === 3 && counts[1] === 2) {
    return 'full_house'
  }

  // Color (5 cartas del mismo palo, pero NO en secuencia)
  if (isFlush && !isStraight) {
    return 'flush'
  }

  // Escalera (5 cartas en secuencia, pero NO del mismo palo)
  if (isStraight && !isFlush) {
    return 'straight'
  }

  // Trío (3 iguales)
  if (counts[0] === 3) {
    return 'three_of_a_kind'
  }

  // Doble Pareja (2 parejas diferentes)
  if (counts[0] === 2 && counts[1] === 2) {
    return 'two_pair'
  }

  // Pareja
  if (counts[0] === 2) {
    return 'pair'
  }

  // Carta Alta
  return 'high_card'
}

/**
 * Verifica si las cartas forman una escalera
 * IMPORTANTE: Requiere exactamente 5 cartas sin duplicados
 */
function checkStraight(sortedCards: Card[]): boolean {
  if (sortedCards.length !== 5) return false

  // Verificar que no haya cartas duplicadas (no puede ser escalera si hay duplicados)
  const ranks = sortedCards.map(c => c.rank)
  const uniqueRanks = new Set(ranks)
  if (uniqueRanks.size !== 5) return false

  const values = sortedCards.map(c => RANK_VALUES[c.rank])

  // Verificar escalera normal (ej: 10-J-Q-K-A o 2-3-4-5-6)
  let isSequential = true
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] - values[i + 1] !== 1) {
      isSequential = false
      break
    }
  }

  if (isSequential) return true

  // Verificar escalera baja con As (A-2-3-4-5)
  // En este caso, el As vale 1, no 14
  if (sortedCards[0].rank === 'A') {
    // Verificar que las otras 4 cartas sean 2, 3, 4, 5
    const otherRanks = ranks.slice(1).sort()
    if (otherRanks.length === 4 && 
        otherRanks[0] === '2' && 
        otherRanks[1] === '3' && 
        otherRanks[2] === '4' && 
        otherRanks[3] === '5') {
      return true
    }
  }

  return false
}

/**
 * Cuenta las ocurrencias de cada rango
 */
function countRanks(cards: Card[]): Record<string, number> {
  const counts: Record<string, number> = {}
  
  for (const card of cards) {
    counts[card.rank] = (counts[card.rank] || 0) + 1
  }
  
  return counts
}

/**
 * Calcula la puntuación de una mano
 * @param cards - Cartas seleccionadas (máx 5)
 * @param jokers - Jokers activos (opcional)
 * @param heldCards - Cartas no jugadas (opcional, para efectos de Jokers)
 */
export function calculateHandScore(
  cards: Card[],
  jokers?: JokerInstance[],
  heldCards?: Card[]
): HandScore {
  const handType = detectPokerHand(cards)
  const baseHand = POKER_HANDS[handType]

  let chips = baseHand.chips
  let multiplier = baseHand.multiplier

  // Añadir puntos de las cartas individuales
  for (const card of cards) {
    const cardValue = RANK_VALUES[card.rank]
    
    // Stone cards no añaden su valor base
    if (card.enhancement !== 'stone') {
      chips += cardValue
    }
    
    // Aplicar bonus y multiplicadores básicos si existen
    if (card.bonus) {
      chips += card.bonus
    }
    if (card.multiplier) {
      multiplier += card.multiplier
    }
  }

  // Aplicar efectos de mejoras y ediciones de cartas
  const cardEffects = calculateAllCardEffects(cards)
  chips += cardEffects.totalAddedChips
  multiplier += cardEffects.totalAddedMult

  // Aplicar efectos de Jokers si están presentes
  if (jokers && jokers.length > 0) {
    const jokerEffects = applyJokerEffects(jokers, {
      handType,
      playedCards: cards,
      heldCards: heldCards || [],
      baseChips: chips,
      baseMult: multiplier
    })
    
    chips += jokerEffects.addedChips
    multiplier += jokerEffects.addedMult
  }

  const score = chips * multiplier

  return {
    handType,
    chips,
    multiplier,
    score
  }
}

/**
 * Obtiene la mejor mano de 5 cartas de un conjunto mayor
 * (Útil si en el futuro permitimos seleccionar más de 5)
 */
export function getBestHand(cards: Card[]): Card[] {
  if (cards.length <= 5) return cards

  // Por ahora retornamos las primeras 5
  // En futuras versiones se implementará evaluación de todas las combinaciones
  return cards.slice(0, 5)
}
