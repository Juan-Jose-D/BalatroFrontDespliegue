// Context API para manejar el estado global del juego

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { GameState, GameConfig, HandHistory } from '../types/game'
import type { Card } from '../types/card'
import type { HandScore } from '../types/poker'
import {
  createInitialGameState,
  playHand as playHandLogic,
  discardCards as discardCardsLogic,
  advanceToNextBlind,
  resetGame as resetGameLogic,
  canPlayHand,
  canDiscard,
  getBlindInfo
} from '../utils/gameLogic'
import {
  toggleCardSelection,
  getSelectedCards,
  removeCards,
  dealCards,
  deselectAllCards
} from '../utils/deck'
import { calculateHandScore } from '../utils/pokerHands'

interface GameContextValue {
  // Estado
  gameState: GameState
  
  // Acciones de cartas
  selectCard: (cardId: string) => void
  playSelectedHand: () => void
  discardSelectedCards: () => void
  
  // Acciones de juego
  advanceRound: () => void
  restartGame: () => void
  
  // Información útil
  selectedCards: Card[]
  currentHandScore: HandScore | null
  blindInfo: ReturnType<typeof getBlindInfo>
  canPlay: boolean
  canDiscard: boolean
}

const GameContext = createContext<GameContextValue | null>(null)

interface GameProviderProps {
  readonly children: ReactNode
  readonly config?: Partial<GameConfig>
}

export function GameProvider({ children, config }: GameProviderProps) {
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState(config))

  // Seleccionar/deseleccionar carta
  const selectCard = useCallback((cardId: string) => {
    setGameState(prev => {
      const selected = getSelectedCards(prev.hand)
      const card = prev.hand.find(c => c.id === cardId)
      
      // No permitir seleccionar más de 5 cartas
      if (card && !card.selected && selected.length >= 5) {
        return prev
      }
      
      return {
        ...prev,
        hand: toggleCardSelection(prev.hand, cardId)
      }
    })
  }, [])

  // Obtener cartas seleccionadas
  const selectedCards = getSelectedCards(gameState.hand)

  // Calcular puntuación de mano actual
  const currentHandScore = selectedCards.length > 0 && selectedCards.length <= 5
    ? calculateHandScore(selectedCards)
    : null

  // Jugar mano seleccionada
  const playSelectedHand = useCallback(() => {
    if (!canPlayHand(gameState) || selectedCards.length === 0 || selectedCards.length > 5) {
      return
    }

    const handScore = calculateHandScore(selectedCards)
    
    setGameState(prev => {
      // Actualizar estado con la puntuación
      let newState = playHandLogic(prev, handScore.score)
      
      // Añadir al historial
      const historyEntry: HandHistory = {
        handType: handScore.handType,
        cards: [...selectedCards],
        chips: handScore.chips,
        multiplier: handScore.multiplier,
        score: handScore.score,
        timestamp: Date.now()
      }
      newState.history = [...newState.history, historyEntry]
      
      // Repartir nuevas cartas para reemplazar las jugadas
      const nonSelectedCards = removeCards(prev.hand, selectedCards)
      const { dealt, remaining } = dealCards(newState.deck, selectedCards.length)
      
      newState.hand = [...nonSelectedCards, ...dealt]
      newState.deck = remaining
      
      return newState
    })
  }, [gameState, selectedCards])

  // Descartar cartas seleccionadas
  const discardSelectedCards = useCallback(() => {
    if (!canDiscard(gameState) || selectedCards.length === 0) {
      return
    }

    setGameState(prev => {
      // Actualizar contador de descartes
      let newState = discardCardsLogic(prev)
      
      // Remover cartas seleccionadas y repartir nuevas
      const nonSelectedCards = removeCards(prev.hand, selectedCards)
      const { dealt, remaining } = dealCards(newState.deck, selectedCards.length)
      
      newState.hand = deselectAllCards([...nonSelectedCards, ...dealt])
      newState.deck = remaining
      
      return newState
    })
  }, [gameState, selectedCards])

  // Avanzar a la siguiente ronda
  const advanceRound = useCallback(() => {
    setGameState(prev => advanceToNextBlind(prev))
  }, [])

  // Reiniciar juego
  const restartGame = useCallback(() => {
    setGameState(resetGameLogic(config))
  }, [config])

  // Información del blind actual
  const blindInfo = getBlindInfo(gameState)

  // Verificaciones
  const canPlay = canPlayHand(gameState) && selectedCards.length > 0 && selectedCards.length <= 5
  const canDiscardCards = canDiscard(gameState) && selectedCards.length > 0

  const value: GameContextValue = useMemo(() => ({
    gameState,
    selectCard,
    playSelectedHand,
    discardSelectedCards,
    advanceRound,
    restartGame,
    selectedCards,
    currentHandScore,
    blindInfo,
    canPlay,
    canDiscard: canDiscardCards
  }), [
    gameState,
    selectCard,
    playSelectedHand,
    discardSelectedCards,
    advanceRound,
    restartGame,
    selectedCards,
    currentHandScore,
    blindInfo,
    canPlay,
    canDiscardCards
  ])

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>
}

// Hook personalizado para usar el contexto
export function useGame() {
  const context = useContext(GameContext)
  if (!context) {
    throw new Error('useGame debe usarse dentro de un GameProvider')
  }
  return context
}
