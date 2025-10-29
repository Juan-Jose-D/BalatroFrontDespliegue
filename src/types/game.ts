// Tipos para el estado del juego

import type { Card } from './card'
import type { PokerHandType } from './poker'

/**
 * Configuración de un Blind (objetivo de ronda)
 */
export interface Blind {
  name: string
  chipRequirement: number  // Puntos necesarios para pasar
  reward: number           // Dinero ganado al completar
  ante: number             // Nivel de ante (dificultad)
}

/**
 * Tipos de Blind
 */
export type BlindType = 'small' | 'big' | 'boss'

/**
 * Estado de una ronda
 */
export interface Round {
  ante: number                    // Nivel actual (1, 2, 3...)
  blind: BlindType               // Tipo de blind actual
  handsRemaining: number         // Manos restantes en esta ronda
  discardsRemaining: number      // Descartes restantes en esta ronda
  score: number                  // Puntuación acumulada en esta ronda
  chipRequirement: number        // Objetivo de puntos para pasar
}

/**
 * Historial de una mano jugada
 */
export interface HandHistory {
  handType: PokerHandType
  cards: Card[]
  chips: number
  multiplier: number
  score: number
  timestamp: number
}

/**
 * Estado completo del juego
 */
export interface GameState {
  // Progreso
  ante: number                   // Nivel actual (aumenta cada 3 blinds)
  blind: BlindType              // Small, Big o Boss
  currentRound: Round
  
  // Recursos del jugador
  money: number                  // Dinero acumulado
  totalScore: number            // Puntuación total del juego
  
  // Estado de la ronda actual
  hand: Card[]                   // Cartas en mano
  deck: Card[]                   // Mazo restante
  
  // Límites por ronda (según Balatro)
  maxHands: number              // Máximo de manos por ronda (default: 4)
  maxDiscards: number           // Máximo de descartes por ronda (default: 3)
  handSize: number              // Tamaño de la mano (default: 8)
  
  // Historial
  history: HandHistory[]        // Historial de manos jugadas
  
  // Estado del juego
  gameStatus: 'playing' | 'won' | 'lost' | 'transitioning'
}

/**
 * Configuración inicial del juego
 */
export interface GameConfig {
  startingMoney: number
  maxHands: number
  maxDiscards: number
  handSize: number
  startingAnte: number
}

/**
 * Constantes del juego (según Balatro)
 */
export const GAME_CONSTANTS = {
  STARTING_MONEY: 4,
  MAX_HANDS: 4,
  MAX_DISCARDS: 3,
  HAND_SIZE: 8,
  STARTING_ANTE: 1,
  
  // Incremento de dificultad por ante
  ANTE_MULTIPLIER: 1.5,
  
  // Recompensas base
  SMALL_BLIND_REWARD: 3,
  BIG_BLIND_REWARD: 4,
  BOSS_BLIND_REWARD: 5,
  
  // Interés por dinero (Fase 4)
  INTEREST_RATE: 0.2,  // 20% hasta máximo $5
  MAX_INTEREST: 5
} as const

/**
 * Configuración de blinds por ante
 */
export function getBlindConfig(ante: number, blindType: BlindType): Blind {
  // Fórmula de Balatro para calcular chip requirement
  let baseRequirement: number
  if (blindType === 'small') {
    baseRequirement = 300
  } else if (blindType === 'big') {
    baseRequirement = 450
  } else {
    baseRequirement = 600
  }
  
  const chipRequirement = Math.floor(baseRequirement * Math.pow(GAME_CONSTANTS.ANTE_MULTIPLIER, ante - 1))
  
  const rewards = {
    small: GAME_CONSTANTS.SMALL_BLIND_REWARD + ante,
    big: GAME_CONSTANTS.BIG_BLIND_REWARD + ante,
    boss: GAME_CONSTANTS.BOSS_BLIND_REWARD + ante
  }
  
  const names = {
    small: 'Small Blind',
    big: 'Big Blind',
    boss: 'Boss Blind'
  }
  
  return {
    name: names[blindType],
    chipRequirement,
    reward: rewards[blindType],
    ante
  }
}

/**
 * Obtiene el siguiente blind en la secuencia
 */
export function getNextBlind(currentBlind: BlindType, currentAnte: number): { blind: BlindType; ante: number } {
  if (currentBlind === 'small') {
    return { blind: 'big', ante: currentAnte }
  } else if (currentBlind === 'big') {
    return { blind: 'boss', ante: currentAnte }
  } else {
    // Después del boss, vuelve a small pero incrementa el ante
    return { blind: 'small', ante: currentAnte + 1 }
  }
}
