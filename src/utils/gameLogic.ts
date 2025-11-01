// Lógica del juego: rondas, blinds, progreso

import type { GameState, GameConfig, Round } from '../types/game'
import { GAME_CONSTANTS, getBlindConfig, getNextBlind } from '../types/game'
import { createDeck, shuffleDeck, dealCards } from './deck'

/**
 * Crea un estado inicial del juego
 */
export function createInitialGameState(config?: Partial<GameConfig>): GameState {
  const finalConfig: GameConfig = {
    startingMoney: config?.startingMoney ?? GAME_CONSTANTS.STARTING_MONEY,
    maxHands: config?.maxHands ?? GAME_CONSTANTS.MAX_HANDS,
    maxDiscards: config?.maxDiscards ?? GAME_CONSTANTS.MAX_DISCARDS,
    handSize: config?.handSize ?? GAME_CONSTANTS.HAND_SIZE,
    startingAnte: config?.startingAnte ?? GAME_CONSTANTS.STARTING_ANTE
  }

  const deck = shuffleDeck(createDeck())
  const { dealt, remaining } = dealCards(deck, finalConfig.handSize)

  const blindConfig = getBlindConfig(finalConfig.startingAnte, 'small')

  return {
    ante: finalConfig.startingAnte,
    blind: 'small',
    currentRound: {
      ante: finalConfig.startingAnte,
      blind: 'small',
      handsRemaining: finalConfig.maxHands,
      discardsRemaining: finalConfig.maxDiscards,
      score: 0,
      chipRequirement: blindConfig.chipRequirement
    },
    money: finalConfig.startingMoney,
    totalScore: 0,
    jokers: [],                   // Sin Jokers al inicio
    maxJokers: GAME_CONSTANTS.MAX_JOKERS,
    hand: dealt,
    deck: remaining,
    maxHands: finalConfig.maxHands,
    maxDiscards: finalConfig.maxDiscards,
    handSize: finalConfig.handSize,
    history: [],
    gameStatus: 'playing'
  }
}

/**
 * Procesa una mano jugada y actualiza el estado
 */
export function playHand(state: GameState, score: number): GameState {
  const newState = { ...state }
  
  // Actualizar puntuación de la ronda
  newState.currentRound = {
    ...newState.currentRound,
    score: newState.currentRound.score + score,
    handsRemaining: newState.currentRound.handsRemaining - 1
  }
  
  // Actualizar puntuación total
  newState.totalScore += score
  
  // Verificar si cumplió el objetivo
  if (newState.currentRound.score >= newState.currentRound.chipRequirement) {
    newState.gameStatus = 'won'
    return newState
  }
  
  // Verificar si se quedó sin manos
  if (newState.currentRound.handsRemaining <= 0) {
    newState.gameStatus = 'lost'
    return newState
  }
  
  return newState
}

/**
 * Procesa un descarte
 */
export function discardCards(state: GameState): GameState {
  if (state.currentRound.discardsRemaining <= 0) {
    return state
  }
  
  return {
    ...state,
    currentRound: {
      ...state.currentRound,
      discardsRemaining: state.currentRound.discardsRemaining - 1
    }
  }
}

/**
 * Avanza al siguiente blind
 */
export function advanceToNextBlind(state: GameState): GameState {
  const blindConfig = getBlindConfig(state.ante, state.blind)
  const reward = blindConfig.reward
  
  // Calcular siguiente blind y ante
  const next = getNextBlind(state.blind, state.ante)
  const nextBlindConfig = getBlindConfig(next.ante, next.blind)
  
  // Crear nuevo mazo y repartir
  const newDeck = shuffleDeck(createDeck())
  const { dealt, remaining } = dealCards(newDeck, state.handSize)
  
  return {
    ...state,
    ante: next.ante,
    blind: next.blind,
    money: state.money + reward,
    jokers: state.jokers,  // Los Jokers persisten entre rondas
    currentRound: {
      ante: next.ante,
      blind: next.blind,
      handsRemaining: state.maxHands,
      discardsRemaining: state.maxDiscards,
      score: 0,
      chipRequirement: nextBlindConfig.chipRequirement
    },
    hand: dealt,
    deck: remaining,
    gameStatus: 'playing'
  }
}

/**
 * Reinicia el juego
 */
export function resetGame(config?: Partial<GameConfig>): GameState {
  return createInitialGameState(config)
}

/**
 * Calcula el progreso de la ronda actual (porcentaje)
 */
export function getRoundProgress(round: Round): number {
  return Math.min((round.score / round.chipRequirement) * 100, 100)
}

/**
 * Verifica si el jugador puede jugar una mano
 */
export function canPlayHand(state: GameState): boolean {
  return state.currentRound.handsRemaining > 0 && state.gameStatus === 'playing'
}

/**
 * Verifica si el jugador puede descartar
 */
export function canDiscard(state: GameState): boolean {
  return state.currentRound.discardsRemaining > 0 && state.gameStatus === 'playing'
}

/**
 * Obtiene información formateada del blind actual
 */
export function getBlindInfo(state: GameState): {
  name: string
  scoreNeeded: number
  scoreRemaining: number
  progress: number
  reward: number
} {
  const blindConfig = getBlindConfig(state.ante, state.blind)
  const scoreRemaining = Math.max(0, state.currentRound.chipRequirement - state.currentRound.score)
  
  return {
    name: blindConfig.name,
    scoreNeeded: state.currentRound.chipRequirement,
    scoreRemaining,
    progress: getRoundProgress(state.currentRound),
    reward: blindConfig.reward
  }
}
