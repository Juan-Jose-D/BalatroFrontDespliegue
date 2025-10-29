// Sistema de aplicación de efectos de Jokers

import type { JokerInstance, JokerContext, JokerEffectsResult, JokerEffect, JokerCondition } from '../types/joker'
import type { Card } from '../types/card'

/**
 * Evalúa si una condición se cumple
 */
function evaluateCondition(condition: JokerCondition | undefined, context: JokerContext): boolean {
  if (!condition) return true

  switch (condition.type) {
    case 'hand_type':
      return condition.handType === context.handType

    case 'suit': {
      if (!condition.stringValue) return false
      return context.playedCards.some(card => card.suit === condition.stringValue)
    }

    case 'rank': {
      if (!condition.stringValue) return false
      // Caso especial: cartas de figura
      if (condition.stringValue === 'face') {
        return context.playedCards.some(card => ['J', 'Q', 'K'].includes(card.rank))
      }
      return context.playedCards.some(card => card.rank === condition.stringValue)
    }

    case 'played_cards': {
      const count = context.playedCards.length
      const value = condition.numberValue ?? 0
      const operator = condition.operator ?? '='
      
      switch (operator) {
        case '=': return count === value
        case '>': return count > value
        case '<': return count < value
        case '>=': return count >= value
        case '<=': return count <= value
        default: return false
      }
    }

    case 'card_count': {
      const count = context.playedCards.length
      const value = condition.numberValue ?? 0
      const operator = condition.operator ?? '='
      
      switch (operator) {
        case '=': return count === value
        case '>': return count > value
        case '<': return count < value
        case '>=': return count >= value
        case '<=': return count <= value
        default: return false
      }
    }

    case 'remaining_cards': {
      const count = context.heldCards.length
      const value = condition.numberValue ?? 0
      const operator = condition.operator ?? '='
      
      switch (operator) {
        case '=': return count === value
        case '>': return count > value
        case '<': return count < value
        case '>=': return count >= value
        case '<=': return count <= value
        default: return false
      }
    }

    default:
      return false
  }
}

/**
 * Cuenta cartas que cumplen una condición
 */
function countMatchingCards(cards: Card[], condition: JokerCondition | undefined): number {
  if (!condition) return cards.length

  switch (condition.type) {
    case 'suit':
      return cards.filter(card => card.suit === condition.stringValue).length

    case 'rank':
      if (condition.stringValue === 'face') {
        return cards.filter(card => ['J', 'Q', 'K'].includes(card.rank)).length
      }
      return cards.filter(card => card.rank === condition.stringValue).length

    default:
      return 0
  }
}

/**
 * Aplica un efecto individual de Joker
 */
function applyJokerEffect(
  effect: JokerEffect,
  context: JokerContext,
  jokerName: string
): { chips: number; mult: number; description?: string } {
  // Verificar condición
  if (!evaluateCondition(effect.condition, context)) {
    return { chips: 0, mult: 0 }
  }

  let chips = 0
  let mult = 0
  let description = ''

  switch (effect.type) {
    case 'mult_flat':
      mult = effect.value
      description = `${jokerName}: +${effect.value} Mult`
      break

    case 'mult_conditional':
      mult = effect.value
      description = `${jokerName}: +${effect.value} Mult`
      break

    case 'chips_flat':
      chips = effect.value
      description = `${jokerName}: +${effect.value} Chips`
      break

    case 'chips_conditional':
      chips = effect.value
      description = `${jokerName}: +${effect.value} Chips`
      break

    case 'mult_per_card': {
      const cards = effect.target === 'played' ? context.playedCards : context.heldCards
      const count = countMatchingCards(cards, effect.condition)
      mult = effect.value * count
      if (count > 0) {
        description = `${jokerName}: +${mult} Mult (${count} cartas × ${effect.value})`
      }
      break
    }

    case 'chips_per_card': {
      const cards = effect.target === 'played' ? context.playedCards : context.heldCards
      const count = countMatchingCards(cards, effect.condition)
      chips = effect.value * count
      if (count > 0) {
        description = `${jokerName}: +${chips} Chips (${count} cartas × ${effect.value})`
      }
      break
    }

    case 'mult_per_hand':
      // Este efecto necesita estado del Joker (contador de manos)
      mult = effect.value * (context.currentRound ?? 0)
      if (mult > 0) {
        description = `${jokerName}: +${mult} Mult`
      }
      break

    case 'special':
      // Efectos especiales se manejan de forma personalizada
      description = `${jokerName}: Efecto especial activado`
      break

    default:
      break
  }

  return { chips, mult, description: description || undefined }
}

/**
 * Aplica todos los efectos de los Jokers activos
 */
export function applyJokerEffects(
  jokers: JokerInstance[],
  context: JokerContext
): JokerEffectsResult {
  let totalAddedChips = 0
  let totalAddedMult = 0
  const descriptions: string[] = []

  for (const joker of jokers) {
    for (const effect of joker.effects) {
      const result = applyJokerEffect(effect, context, joker.name)
      
      totalAddedChips += result.chips
      totalAddedMult += result.mult
      
      if (result.description) {
        descriptions.push(result.description)
      }
    }
  }

  return {
    addedChips: totalAddedChips,
    addedMult: totalAddedMult,
    description: descriptions
  }
}

/**
 * Crea una instancia de Joker a partir de su definición
 */
export function createJokerInstance(joker: JokerInstance): JokerInstance {
  return {
    ...joker,
    instanceId: `${joker.id}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
    timesTriggered: 0,
    state: joker.state || {}
  }
}
