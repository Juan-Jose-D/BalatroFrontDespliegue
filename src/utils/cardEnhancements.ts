// Efectos de mejoras y ediciones de cartas

import type { Card } from '../types/card'

export interface EnhancementResult {
  addedChips: number
  addedMult: number
  moneyEarned: number
  shouldBreak: boolean // Para glass cards
  descriptions: string[]
}

/**
 * Calcula los efectos de las mejoras de una carta
 */
export function calculateCardEnhancementEffects(card: Card): EnhancementResult {
  let addedChips = 0
  let addedMult = 0
  let moneyEarned = 0
  let shouldBreak = false
  const descriptions: string[] = []

  // Efectos de mejoras
  if (card.enhancement) {
    switch (card.enhancement) {
      case 'bonus':
        // Bonus: +30 chips
        addedChips += 30
        descriptions.push(`${card.rank}: +30 Chips (Bonus)`)
        break

      case 'mult':
        // Mult: +4 multiplicador
        addedMult += 4
        descriptions.push(`${card.rank}: +4 Mult`)
        break

      case 'wild':
        // Wild: Comodín - cuenta como cualquier palo (no da bonificación numérica directa)
        descriptions.push(`${card.rank}: Comodín (Wild)`)
        break

      case 'glass':
        // Glass: +50 chips pero se rompe después de jugarse (alta recompensa, alto riesgo)
        addedChips += 50
        shouldBreak = true
        descriptions.push(`${card.rank}: +50 Chips (Glass - Se romperá)`)
        break

      case 'steel':
        // Steel: +50 chips (resistente, buen balance)
        addedChips += 50
        descriptions.push(`${card.rank}: +50 Chips (Steel)`)
        break

      case 'stone':
        // Stone: +50 chips, no añade valor de carta base (bloquea valor pero da chips fijos)
        addedChips += 50
        descriptions.push(`${card.rank}: +50 Chips (Stone - Sin valor base)`)
        break

      case 'gold':
        // Gold: +$3 al jugar (genera economía)
        moneyEarned += 3
        descriptions.push(`${card.rank}: +$3 (Gold)`)
        break

      case 'lucky':
        // Lucky: 1 en 5 chance de +20 mult (alta varianza)
        if (Math.random() < 0.2) {
          addedMult += 20
          descriptions.push(`${card.rank}: +20 Mult (Lucky!)`)
        } else {
          descriptions.push(`${card.rank}: Sin suerte`)
        }
        break
    }
  }

  return {
    addedChips,
    addedMult,
    moneyEarned,
    shouldBreak,
    descriptions
  }
}

/**
 * Calcula los efectos de las ediciones de una carta
 */
export function calculateCardEditionEffects(card: Card): EnhancementResult {
  let addedChips = 0
  let addedMult = 0
  const descriptions: string[] = []

  // Efectos de ediciones
  if (card.edition) {
    switch (card.edition) {
      case 'foil':
        // Foil: +50 chips (efecto visual metálico)
        addedChips += 50
        descriptions.push(`${card.rank}: +50 Chips (Foil)`)
        break

      case 'holographic':
        // Holographic: +10 mult (efecto visual arcoíris)
        addedMult += 10
        descriptions.push(`${card.rank}: +10 Mult (Holo)`)
        break

      case 'polychrome':
        // Polychrome: x1.5 mult (efecto visual multicolor)
        // Nota: Este es multiplicativo, se aplica al total
        addedMult += Math.floor(addedMult * 0.5)
        descriptions.push(`${card.rank}: x1.5 Mult (Polychrome)`)
        break
    }
  }

  return {
    addedChips,
    addedMult,
    moneyEarned: 0,
    shouldBreak: false,
    descriptions
  }
}

/**
 * Combina todos los efectos de mejoras y ediciones de las cartas jugadas
 */
export function calculateAllCardEffects(cards: Card[]): {
  totalAddedChips: number
  totalAddedMult: number
  totalMoney: number
  brokenCards: Card[]
  descriptions: string[]
} {
  let totalAddedChips = 0
  let totalAddedMult = 0
  let totalMoney = 0
  const brokenCards: Card[] = []
  const descriptions: string[] = []

  for (const card of cards) {
    // Aplicar efectos de mejoras
    const enhancementEffects = calculateCardEnhancementEffects(card)
    totalAddedChips += enhancementEffects.addedChips
    totalAddedMult += enhancementEffects.addedMult
    totalMoney += enhancementEffects.moneyEarned
    descriptions.push(...enhancementEffects.descriptions)

    if (enhancementEffects.shouldBreak) {
      brokenCards.push(card)
    }

    // Aplicar efectos de ediciones
    const editionEffects = calculateCardEditionEffects(card)
    totalAddedChips += editionEffects.addedChips
    totalAddedMult += editionEffects.addedMult
    descriptions.push(...editionEffects.descriptions)
  }

  return {
    totalAddedChips,
    totalAddedMult,
    totalMoney,
    brokenCards,
    descriptions
  }
}
