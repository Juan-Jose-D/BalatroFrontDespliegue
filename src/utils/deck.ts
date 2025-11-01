import type { Card } from '../types/card'
import { ALL_SUITS, ALL_RANKS } from '../types/card'

/**
 * Genera un mazo estándar de 52 cartas
 */
export function createDeck(): Card[] {
  const deck: Card[] = []
  
  for (const suit of ALL_SUITS) {
    for (const rank of ALL_RANKS) {
      deck.push({
        id: `${rank}-${suit}`,
        suit,
        rank,
        selected: false
      })
    }
  }
  
  return deck
}

/**
 * Baraja un mazo usando el algoritmo Fisher-Yates
 */
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck]
  
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled
}

/**
 * Reparte cartas del mazo
 * @param deck - Mazo de donde sacar cartas
 * @param count - Número de cartas a repartir
 * @returns Un array con las cartas repartidas y el mazo restante
 */
export function dealCards(deck: Card[], count: number): { dealt: Card[], remaining: Card[] } {
  const dealt = deck.slice(0, count)
  const remaining = deck.slice(count)
  
  return { dealt, remaining }
}

/**
 * Resetea el estado de selección de todas las cartas
 */
export function deselectAllCards(cards: Card[]): Card[] {
  return cards.map(card => ({ ...card, selected: false }))
}

/**
 * Alterna el estado de selección de una carta
 */
export function toggleCardSelection(cards: Card[], cardId: string): Card[] {
  return cards.map(card => 
    card.id === cardId 
      ? { ...card, selected: !card.selected }
      : card
  )
}

/**
 * Obtiene las cartas seleccionadas
 */
export function getSelectedCards(cards: Card[]): Card[] {
  return cards.filter(card => card.selected)
}

/**
 * Remueve cartas específicas del array
 */
export function removeCards(cards: Card[], cardsToRemove: Card[]): Card[] {
  const idsToRemove = new Set(cardsToRemove.map(c => c.id))
  return cards.filter(card => !idsToRemove.has(card.id))
}
