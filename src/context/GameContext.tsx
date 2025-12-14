// Context API para manejar el estado global del juego

import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { GameState, GameConfig, HandHistory } from '../types/game'
import type { Card } from '../types/card'
import type { HandScore } from '../types/poker'
import type { JokerInstance } from '../types/joker'
import type { ShopItem } from '../types/shop'
import { calculateInterest } from '../utils/shopLogic'
import { calculateAllCardEffects } from '../utils/cardEnhancements'
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
  
  // Acciones de Jokers
  addJoker: (joker: JokerInstance) => boolean
  removeJoker: (instanceId: string) => void
  
  // Acciones de tienda
  buyShopItem: (item: ShopItem) => boolean
  rerollShop: (cost: number) => boolean
  sellJoker: (instanceId: string) => void
  applyEnhancementToCard: (cardId: string, enhancement: Card['enhancement']) => boolean
  applyEditionToCard: (cardId: string, edition: Card['edition']) => boolean
  
  // Acciones de juego
  advanceRound: () => void
  restartGame: () => void
  loseGame: (reason?: string) => void
  
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
    ? calculateHandScore(selectedCards, gameState.jokers, gameState.hand.filter(c => !c.selected))
    : null

  // Jugar mano seleccionada
  const playSelectedHand = useCallback(() => {
    if (!canPlayHand(gameState) || selectedCards.length === 0 || selectedCards.length > 5) {
      return
    }

    const heldCards = gameState.hand.filter(c => !c.selected)
    const handScore = calculateHandScore(selectedCards, gameState.jokers, heldCards)
    
    // Calcular efectos de mejoras (dinero de gold, cartas rotas de glass)
    const cardEffects = calculateAllCardEffects(selectedCards)
    
    setGameState(prev => {
      // Actualizar estado con la puntuación
      let newState = playHandLogic(prev, handScore.score)
      
      // Añadir dinero de cartas gold
      if (cardEffects.totalMoney > 0) {
        newState.money += cardEffects.totalMoney
      }
      
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
      
      // Remover cartas jugadas (incluyendo las rotas)
      const nonSelectedCards = removeCards(prev.hand, selectedCards)
      
      // Determinar cuántas cartas repartir (menos si algunas se rompieron)
      const cardsToReplace = selectedCards.length - cardEffects.brokenCards.length
      const { dealt, remaining } = dealCards(newState.deck, cardsToReplace)
      
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
    setGameState(prev => {
      const newState = advanceToNextBlind(prev)
      // Añadir interés al dinero
      const interest = calculateInterest(prev.money)
      return {
        ...newState,
        money: newState.money + interest
      }
    })
  }, [])

  // Reiniciar juego
  const restartGame = useCallback(() => {
    setGameState(resetGameLogic(config))
  }, [config])

  // Marcar juego como perdido
  const loseGame = useCallback((reason?: string) => {
    setGameState(prev => ({
      ...prev,
      gameStatus: 'lost'
    }))
  }, [])

  // Añadir un Joker
  const addJoker = useCallback((joker: JokerInstance): boolean => {
    if (gameState.jokers.length >= gameState.maxJokers) {
      return false // No hay espacio
    }
    
    setGameState(prev => ({
      ...prev,
      jokers: [...prev.jokers, joker]
    }))
    
    return true
  }, [gameState.jokers.length, gameState.maxJokers])

  // Remover un Joker
  const removeJoker = useCallback((instanceId: string) => {
    setGameState(prev => ({
      ...prev,
      jokers: prev.jokers.filter(j => j.instanceId !== instanceId)
    }))
  }, [])

  // Comprar item de la tienda
  const buyShopItem = useCallback((item: ShopItem): boolean => {
    if (gameState.money < item.cost) {
      return false // No hay suficiente dinero
    }
    
    if (item.type === 'joker' && item.joker) {
      const success = addJoker({ ...item.joker, instanceId: item.id })
      if (success) {
        setGameState(prev => ({
          ...prev,
          money: prev.money - item.cost
        }))
        return true
      }
      return false
    }
    
    if (item.type === 'card_enhancement' && item.enhancement) {
      // Guardar la mejora comprada para que el jugador la aplique manualmente
      setGameState(prev => ({
        ...prev,
        money: prev.money - item.cost,
        // Aquí se podría guardar las mejoras compradas pendientes de aplicar
      }))
      return true
    }
    
    return false
  }, [gameState.money, addJoker])

  // Aplicar mejora a una carta específica
  const applyEnhancementToCard = useCallback((cardId: string, enhancement: Card['enhancement']): boolean => {
    const card = gameState.hand.find(c => c.id === cardId)
    if (!card) return false
    
    setGameState(prev => ({
      ...prev,
      hand: prev.hand.map(c => 
        c.id === cardId 
          ? { ...c, enhancement }
          : c
      )
    }))
    
    return true
  }, [gameState.hand])

  // Aplicar edición a una carta específica
  const applyEditionToCard = useCallback((cardId: string, edition: Card['edition']): boolean => {
    const card = gameState.hand.find(c => c.id === cardId)
    if (!card) return false
    
    setGameState(prev => ({
      ...prev,
      hand: prev.hand.map(c => 
        c.id === cardId 
          ? { ...c, edition }
          : c
      )
    }))
    
    return true
  }, [gameState.hand])

  // Vender Joker
  const sellJoker = useCallback((instanceId: string) => {
    const joker = gameState.jokers.find(j => j.instanceId === instanceId)
    if (!joker) return
    
    const sellPrice = Math.floor(joker.cost / 2)
    removeJoker(instanceId)
    
    setGameState(prev => ({
      ...prev,
      money: prev.money + sellPrice
    }))
  }, [gameState.jokers, removeJoker])

  // Reroll tienda
  const rerollShop = useCallback((cost: number): boolean => {
    if (gameState.money < cost) {
      return false
    }
    
    setGameState(prev => ({
      ...prev,
      money: prev.money - cost
    }))
    
    return true
  }, [gameState.money])

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
    addJoker,
    removeJoker,
    buyShopItem,
    rerollShop,
    sellJoker,
    applyEnhancementToCard,
    applyEditionToCard,
    advanceRound,
    restartGame,
    loseGame,
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
    addJoker,
    removeJoker,
    buyShopItem,
    rerollShop,
    sellJoker,
    applyEnhancementToCard,
    applyEditionToCard,
    advanceRound,
    restartGame,
    loseGame,
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
