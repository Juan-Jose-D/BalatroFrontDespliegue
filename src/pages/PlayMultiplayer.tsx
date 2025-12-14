import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import Card from '../components/game/Card'
import JokerCard from '../components/game/JokerCard'
import Shop from '../components/Shop'
import Button from '../components/Button'
import FloatingNotification from '../components/FloatingNotification'
import VoiceControls from '../components/VoiceControls'
import playBg from '../assets/backgrounds/generalBackground.png'
import { useGameMultiplayer } from '../context/GameMultiplayerContext'
import { useNotifications } from '../hooks/useNotifications'
import { POKER_HANDS } from '../types/poker'
import { getRandomJoker } from '../data/jokers'
import { createJokerInstance } from '../utils/jokerEffects'
import { calculateInterest } from '../utils/shopLogic'
import { calculateAllCardEffects } from '../utils/cardEnhancements'
import { webSocketService } from '../services/WebSocketService'
import { useAuth } from '../context/AuthContext'
import { getPlayerId } from '../utils/playerId'
import type { ShopItem } from '../types/shop'
import { MessageType } from '../types/backend'
import { gameMessageService } from '../services/GameMessageService'

function PlayMultiplayerGame() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [showShop, setShowShop] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { notifications, addNotification, removeNotification } = useNotifications()
  
  const {
    game,
    opponentId,
    opponentName,
    opponentScore,
    opponentMoney,
    opponentHands,
    opponentDiscards,
    playerId,
    gameId: contextGameId,
    chatMessages,
    sendChatMessage,
    sendGameAction,
    lastOpponentAction,
    opponentRoundComplete,
    opponentGameWon,
    opponentGameLost,
    opponentGameWonReason,
    opponentAnte,
    opponentBlind,
    opponentNoHandsInfo
  } = useGameMultiplayer()
  
  const { isAuthenticated } = useAuth()
  const [localCognitoUsername, setLocalCognitoUsername] = useState<string>('')
  const [remoteCognitoUsername, setRemoteCognitoUsername] = useState<string>('')
  
  // Obtener gameId
  const gameId = searchParams.get('gameId') || contextGameId || ''
  
  // Obtener username de Cognito del jugador local
  useEffect(() => {
    const initializeCognitoUsernames = async () => {
      if (isAuthenticated) {
        try {
          const cognitoUsername = await getPlayerId()
          setLocalCognitoUsername(cognitoUsername)
          console.log('✅ Username de Cognito local obtenido:', cognitoUsername)
        } catch (error) {
          console.error('❌ Error al obtener username de Cognito:', error)
        }
      }
    }
    initializeCognitoUsernames()
  }, [isAuthenticated])
  
  // Obtener username de Cognito del oponente
  // IMPORTANTE: El opponentId debe ser el username de Cognito, no un UUID
  useEffect(() => {
    console.log('🔍 [PlayMultiplayer] opponentId changed, verificando para voice chat:', opponentId)
    
    if (opponentId) {
      // Verificar que opponentId sea un username de Cognito válido
      const isCognitoUsername = !opponentId.startsWith('player-') && 
                                !opponentId.startsWith('opponent-') &&
                                !opponentId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
      
      console.log('🔍 [PlayMultiplayer] ¿Es username de Cognito válido?', isCognitoUsername)
      
      if (isCognitoUsername) {
        setRemoteCognitoUsername(prevValue => {
          if (prevValue !== opponentId) {
            console.log('🔄 [PlayMultiplayer] Actualizando remoteCognitoUsername:', {
              prevValue,
              newValue: opponentId,
              IMPORTANTE: 'ESTO PUEDE CAUSAR REMOUNT DE VoiceControls'
            })
          }
          return opponentId
        })
        console.log('✅ Username de Cognito remoto obtenido:', opponentId)
      } else {
        console.warn('⚠️ ADVERTENCIA: opponentId no es un username de Cognito válido:', opponentId)
        console.warn('⚠️ El chat de voz requiere que el backend envíe usernames de Cognito en lugar de UUIDs')
        setRemoteCognitoUsername(prevValue => {
          if (prevValue !== '') {
            console.log('🔄 [PlayMultiplayer] Limpiando remoteCognitoUsername (opponentId inválido)', {
              prevValue,
              invalidOpponentId: opponentId
            })
          }
          return ''
        })
      }
    }
  }, [opponentId])
  
  // Log para debug
  useEffect(() => {
    if (gameId && localCognitoUsername && remoteCognitoUsername) {
      console.log('🎤 Chat de Voz - Configuración:', {
        gameId,
        localCognitoUsername,
        remoteCognitoUsername,
        ambosUsernamesValidos: !!(localCognitoUsername && remoteCognitoUsername)
      })
    }
  }, [gameId, localCognitoUsername, remoteCognitoUsername])
  
  // Verificar si el WebSocket está conectado
  const [isConnected, setIsConnected] = useState(false)
  
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(webSocketService.isWebSocketConnected())
    }
    
    checkConnection()
    const interval = setInterval(checkConnection, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const {
    gameState,
    selectCard,
    playSelectedHand,
    discardSelectedCards,
    advanceRound,
    addJoker,
    buyShopItem,
    rerollShop,
    sellJoker,
    currentHandScore,
    blindInfo,
    canPlay,
    canDiscard,
    selectedCards
  } = game

  // Auto-scroll chat
  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, showChat])

  // Detectar mensajes nuevos cuando el chat está cerrado
  useEffect(() => {
    if (!showChat && chatMessages.length > 0) {
      setHasUnreadMessages(true)
    }
  }, [chatMessages, showChat])

  // Marcar mensajes como leídos cuando se abre el chat
  useEffect(() => {
    if (showChat) {
      setHasUnreadMessages(false)
    }
  }, [showChat])

  // Estado para el cronómetro cuando el oponente completa la ronda
  const [roundTimer, setRoundTimer] = useState<number | null>(null)
  const [isOpponentWaiting, setIsOpponentWaiting] = useState(false)
  const [lostByTimeout, setLostByTimeout] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const lastRoundCompleteRef = useRef<{ ante: number; blind: string } | null>(null)
  const isInitializingTimerRef = useRef<boolean>(false)
  const lastOpponentRoundRef = useRef<{ ante: number; blind: string } | null>(null)
  
  // Estado para rastrear cuando el jugador local se queda sin manos
  const [localNoHands, setLocalNoHands] = useState<{ ante: number; blind: string } | null>(null)
  
  // Debug: Log cuando cambian los estados del cronómetro
  useEffect(() => {
    console.log('🕐 Estado del cronómetro:', { isOpponentWaiting, roundTimer, hasTimer: timerRef.current !== null })
  }, [isOpponentWaiting, roundTimer])

  // Función para comparar progreso: determina si el oponente está más adelantado
  const isOpponentAhead = useCallback(() => {
    // Comparar ante primero
    if (opponentAnte > gameState.ante) return true
    if (opponentAnte < gameState.ante) return false
    
    // Si están en el mismo ante, comparar blind
    const blindOrder = { small: 1, big: 2, boss: 3 }
    return blindOrder[opponentBlind] > blindOrder[gameState.blind]
  }, [opponentAnte, opponentBlind, gameState.ante, gameState.blind])
  
  // Función para verificar si ambos jugadores están en el mismo nivel
  const areAtSameLevel = useCallback(() => {
    return opponentAnte === gameState.ante && opponentBlind === gameState.blind
  }, [opponentAnte, opponentBlind, gameState.ante, gameState.blind])
  
  // Función para verificar si el jugador local está adelante o al mismo nivel
  const isLocalAheadOrEqual = useCallback(() => {
    if (gameState.ante > opponentAnte) return true
    if (gameState.ante < opponentAnte) return false
    const blindOrder = { small: 1, big: 2, boss: 3 }
    return blindOrder[gameState.blind] >= blindOrder[opponentBlind]
  }, [opponentAnte, opponentBlind, gameState.ante, gameState.blind])

  // Detectar cuando el jugador local completa una ronda y notificar al oponente
  useEffect(() => {
    if (gameState.gameStatus === 'won' && gameId) {
      const currentRound = { ante: gameState.ante, blind: gameState.blind }
      
      // Evitar enviar múltiples veces el mismo ROUND_COMPLETE
      if (lastRoundCompleteRef.current && 
          lastRoundCompleteRef.current.ante === currentRound.ante && 
          lastRoundCompleteRef.current.blind === currentRound.blind) {
        console.log('⏭️ ROUND_COMPLETE ya enviado para esta ronda, omitiendo...')
        return
      }
      
      console.log('🎉 Jugador local completó una ronda, notificando al oponente...', {
        ante: gameState.ante,
        blind: gameState.blind,
        score: gameState.currentRound.score,
        gameId
      })
      
      // CRÍTICO: Cuando el jugador local completa una ronda (especialmente después de boss),
      // verificar inmediatamente si debe detenerse el cronómetro
      const blindOrder = { small: 1, big: 2, boss: 3 }
      const localBlindOrder = blindOrder[gameState.blind as keyof typeof blindOrder]
      const oppBlindOrder = blindOrder[opponentBlind as keyof typeof blindOrder]
      
      const localIsAhead = gameState.ante > opponentAnte || 
                          (gameState.ante === opponentAnte && localBlindOrder > oppBlindOrder)
      const sameLevel = gameState.ante === opponentAnte && localBlindOrder === oppBlindOrder
      
      // Si el jugador local está adelante o al mismo nivel, DETENER el cronómetro inmediatamente
      if ((localIsAhead || sameLevel) && (timerRef.current !== null || isOpponentWaiting)) {
        console.log('🛑 DETENIENDO cronómetro: jugador local completó ronda y está adelante o al mismo nivel', {
          local: { ante: gameState.ante, blind: gameState.blind },
          opponent: { ante: opponentAnte, blind: opponentBlind },
          localIsAhead,
          sameLevel
        })
        // Detener el cronómetro manualmente
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        setIsOpponentWaiting(false)
        setRoundTimer(null)
        isInitializingTimerRef.current = false
      }
      
      // Marcar que ya enviamos este ROUND_COMPLETE
      lastRoundCompleteRef.current = currentRound
      
      // Enviar mensaje ROUND_COMPLETE
      gameMessageService.sendGameMessage(
        {
          action: 'ROUND_COMPLETE',
          data: {
            ante: gameState.ante,
            blind: gameState.blind,
            score: gameState.currentRound.score
          }
        },
        MessageType.ROUND_COMPLETE
      )
      
      console.log('✅ Mensaje ROUND_COMPLETE enviado al backend')
    }
  }, [gameState.gameStatus, gameState.ante, gameState.blind, gameState.currentRound.score, gameId, opponentAnte, opponentBlind, isOpponentWaiting])
  
  // Efecto para detener el cronómetro cuando el jugador local completa una ronda y está adelante o al mismo nivel
  useEffect(() => {
    if (gameState.gameStatus === 'won') {
      // CRÍTICO: Cuando el jugador local completa una ronda, verificar si debe detener el cronómetro
      // Si el jugador local está adelante o al mismo nivel, detener el cronómetro inmediatamente
      if (isLocalAheadOrEqual() || areAtSameLevel()) {
        console.log('🛑 Jugador local completó ronda y está adelante o al mismo nivel, deteniendo cronómetro')
        if (timerRef.current !== null || isOpponentWaiting) {
          // Usar stopTimer si está disponible, sino limpiar manualmente
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          setIsOpponentWaiting(false)
          setRoundTimer(null)
          isInitializingTimerRef.current = false
        }
      }
    }
  }, [gameState.gameStatus, gameState.ante, gameState.blind, isLocalAheadOrEqual, areAtSameLevel, isOpponentWaiting])

  // Detectar cuando el jugador local se queda sin manos
  // NO enviamos GAME_WON inmediatamente, esperamos a verificar el progreso
  useEffect(() => {
    if (gameState.gameStatus === 'lost' && gameId && !lostByTimeout) {
      const reason = gameState.currentRound.handsRemaining <= 0 ? 'no_hands' : 'unknown'
      
      if (reason === 'no_hands') {
        // Marcar que el jugador local se quedó sin manos
        if (!localNoHands) {
          console.log('💀 Jugador local se quedó sin manos en Ante', gameState.ante, 'Blind', gameState.blind)
          setLocalNoHands({ ante: gameState.ante, blind: gameState.blind })
        }
        
        // Enviar GAME_LOST para notificar al oponente
        gameMessageService.sendGameMessage(
          {
            action: 'GAME_LOST',
            data: {
              reason: 'no_hands',
              ante: gameState.ante,
              blind: gameState.blind,
              score: gameState.currentRound.score
            }
          },
          MessageType.GAME_LOST
        )
        
        // Limpiar timer si estaba activo
        if (timerRef.current) {
          clearInterval(timerRef.current)
          timerRef.current = null
        }
        setIsOpponentWaiting(false)
        setRoundTimer(null)
      } else {
        // Si perdió por otra razón (no no_hands), enviar GAME_WON inmediatamente
        console.log('💀 Jugador local perdió (no por timeout, no por no_hands), notificando al oponente...')
        
        gameMessageService.sendGameMessage(
          {
            action: 'GAME_LOST',
            data: {
              reason: reason,
              ante: gameState.ante,
              blind: gameState.blind,
              score: gameState.currentRound.score
            }
          },
          MessageType.GAME_LOST
        )
        
        gameMessageService.sendGameMessage(
          {
            action: 'GAME_WON',
            data: {
              reason: 'opponent_lost',
              message: 'El oponente perdió',
              ante: gameState.ante,
              blind: gameState.blind,
              score: gameState.currentRound.score
            }
          },
          MessageType.GAME_WON
        )
      }
    }
  }, [gameState.gameStatus, gameState.ante, gameState.blind, gameState.currentRound.score, gameState.currentRound.handsRemaining, gameId, lostByTimeout, localNoHands])

  // Función para comparar si un progreso está más adelante que otro
  const isProgressAhead = useCallback((ante1: number, blind1: string, ante2: number, blind2: string) => {
    if (ante1 > ante2) return true
    if (ante1 < ante2) return false
    const blindOrder = { small: 1, big: 2, boss: 3 }
    return blindOrder[blind1 as keyof typeof blindOrder] > blindOrder[blind2 as keyof typeof blindOrder]
  }, [])
  
  // Función para verificar si un progreso superó otro (pasó de ante o avanzó de blind)
  const hasProgressSurpassed = useCallback((currentAnte: number, currentBlind: string, targetAnte: number, targetBlind: string) => {
    // Si el ante actual es mayor, definitivamente superó
    if (currentAnte > targetAnte) return true
    // Si el ante es igual pero el blind es mayor, superó
    if (currentAnte === targetAnte) {
      const blindOrder = { small: 1, big: 2, boss: 3 }
      return blindOrder[currentBlind as keyof typeof blindOrder] > blindOrder[targetBlind as keyof typeof blindOrder]
    }
    return false
  }, [])
  
  // Efecto para verificar cuándo declarar victoria cuando alguien se queda sin manos
  useEffect(() => {
    // Solo verificar si el juego está en curso
    if (gameState.gameStatus !== 'playing' && gameState.gameStatus !== 'lost') {
      return
    }
    
    const currentProgress = { ante: gameState.ante, blind: gameState.blind }
    const opponentProgress = { ante: opponentAnte, blind: opponentBlind }
    
    // CASO 1: El oponente se quedó sin manos
    if (opponentNoHandsInfo && !opponentGameLost && !opponentGameWon) {
      const opponentNoHandsProgress = { ante: opponentNoHandsInfo.ante, blind: opponentNoHandsInfo.blind }
      
      // Si el jugador local está más adelante que donde el oponente se quedó sin manos → VICTORIA
      if (isProgressAhead(currentProgress.ante, currentProgress.blind, opponentNoHandsProgress.ante, opponentNoHandsProgress.blind)) {
        console.log('🏆 ¡VICTORIA! El jugador local está más adelante que donde el oponente se quedó sin manos')
        
        // Enviar mensaje de victoria (el contexto lo procesará y establecerá opponentGameLost)
        if (gameId) {
          gameMessageService.sendGameMessage(
            {
              action: 'GAME_WON',
              data: {
                reason: 'opponent_no_hands',
                message: 'El oponente se quedó sin manos',
                ante: currentProgress.ante,
                blind: currentProgress.blind,
                score: gameState.currentRound.score
              }
            },
            MessageType.GAME_WON
          )
        }
      }
      // Si están en el mismo ante donde el oponente se quedó sin manos
      else if (currentProgress.ante === opponentNoHandsProgress.ante && currentProgress.blind === opponentNoHandsProgress.blind) {
        // Si el jugador local también se quedó sin manos → EMPATE
        if (localNoHands && localNoHands.ante === opponentNoHandsProgress.ante && localNoHands.blind === opponentNoHandsProgress.blind) {
          console.log('🤝 EMPATE: Ambos jugadores se quedaron sin manos en el mismo ante')
          // Marcar como empate (ambos perdieron)
          if (gameId) {
            gameMessageService.sendGameMessage(
              {
                action: 'GAME_LOST',
                data: {
                  reason: 'tie',
                  message: 'Empate: Ambos jugadores se quedaron sin manos',
                  ante: currentProgress.ante,
                  blind: currentProgress.blind,
                  score: gameState.currentRound.score
                }
              },
              MessageType.GAME_LOST
            )
          }
        }
        // Si el jugador local pasa de ante → VICTORIA (se verifica en el siguiente else if)
      }
      // Si el jugador local pasa de ante después de que el oponente se quedó sin manos en el mismo ante
      else if (hasProgressSurpassed(currentProgress.ante, currentProgress.blind, opponentNoHandsProgress.ante, opponentNoHandsProgress.blind)) {
        console.log('🏆 ¡VICTORIA! El jugador local pasó de ante después de que el oponente se quedó sin manos')
        if (gameId) {
          gameMessageService.sendGameMessage(
            {
              action: 'GAME_WON',
              data: {
                reason: 'opponent_no_hands',
                message: 'El oponente se quedó sin manos',
                ante: currentProgress.ante,
                blind: currentProgress.blind,
                score: gameState.currentRound.score
              }
            },
            MessageType.GAME_WON
          )
        }
      }
    }
    
    // CASO 2: El jugador local se quedó sin manos
    if (localNoHands && gameState.gameStatus === 'lost' && !opponentGameLost && !opponentGameWon) {
      const localNoHandsProgress = { ante: localNoHands.ante, blind: localNoHands.blind }
      
      // Si el oponente está más adelante que donde el jugador local se quedó sin manos → DERROTA (ya está marcado)
      if (isProgressAhead(opponentProgress.ante, opponentProgress.blind, localNoHandsProgress.ante, localNoHandsProgress.blind)) {
        console.log('💀 El oponente está más adelante, el jugador local perdió')
        // Ya está marcado como perdido, no hacer nada
      }
      // Si el oponente supera el ante donde el jugador local se quedó sin manos → El oponente ganó
      else if (hasProgressSurpassed(opponentProgress.ante, opponentProgress.blind, localNoHandsProgress.ante, localNoHandsProgress.blind)) {
        console.log('💀 El oponente superó el ante donde el jugador local se quedó sin manos - El oponente ganó')
        // El oponente ganó, esto se manejará cuando el oponente reciba el GAME_WON
        // No hacemos nada aquí porque el jugador local ya perdió
      }
    }
  }, [
    gameState.gameStatus,
    gameState.ante,
    gameState.blind,
    gameState.currentRound.score,
    opponentAnte,
    opponentBlind,
    opponentNoHandsInfo,
    opponentGameLost,
    opponentGameWon,
    localNoHands,
    isProgressAhead,
    hasProgressSurpassed,
    gameId
  ])

  // Notificación cuando el oponente completa una ronda (SIEMPRE, independientemente de quién esté adelante)
  useEffect(() => {
    if (opponentRoundComplete && gameState.gameStatus === 'playing') {
      console.log('🔔 Mostrando notificación: oponente completó una ronda')
      addNotification(`${opponentName} completó la ronda`, 'opponent', 2000)
    }
  }, [opponentRoundComplete, gameState.gameStatus, opponentName, addNotification])

  // Cronómetro de 15 segundos cuando el jugador local está por detrás del oponente
  // Lógica:
  // 1. Se inicia cuando el oponente completa una ronda Y el jugador local está por detrás
  // 2. NO se resetea si el oponente completa otra ronda - continúa con el tiempo restante
  // 3. Se detiene cuando el jugador local alcanza o supera al oponente
  
  // Función para iniciar el cronómetro
  const startTimer = useCallback(() => {
    // Evitar iniciar múltiples veces
    if (timerRef.current !== null || isInitializingTimerRef.current) {
      console.log('⏸️ Cronómetro ya está activo o inicializándose, omitiendo...')
      return
    }
    
    console.log('⏰ Iniciando cronómetro de 15 segundos...')
    isInitializingTimerRef.current = true
    
    setIsOpponentWaiting(true)
    setRoundTimer(15)
    
    // Limpiar timer anterior si existe (por seguridad)
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    // Iniciar cronómetro
    timerRef.current = setInterval(() => {
      setRoundTimer(prev => {
        if (prev === null || prev <= 0) {
          // Tiempo agotado
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          return 0
        }
        const newTime = prev - 1
        if (newTime <= 0) {
          // Tiempo agotado
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          return 0
        }
        return newTime
      })
    }, 1000)
    
    // Marcar que ya terminó la inicialización
    setTimeout(() => {
      isInitializingTimerRef.current = false
      console.log('✅ Cronómetro iniciado correctamente')
    }, 100)
  }, [])
  
  // Función para detener el cronómetro
  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      console.log('🛑 Deteniendo cronómetro...')
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setIsOpponentWaiting(false)
    setRoundTimer(null)
    isInitializingTimerRef.current = false
  }, [])
  
  // Efecto para iniciar el cronómetro cuando el oponente completa una ronda y estamos por detrás
  // REGLA CRÍTICA: El cronómetro SOLO se activa si el OPONENTE está ADELANTE y completa una ronda
  // NUNCA se activa si el jugador local está adelante o al mismo nivel
  useEffect(() => {
    console.log('⏰ Efecto del cronómetro ejecutado:', {
      gameStatus: gameState.gameStatus,
      opponentRoundComplete,
      opponentAnte,
      opponentBlind,
      localAnte: gameState.ante,
      localBlind: gameState.blind,
      isOpponentWaiting
    })
    
    // Solo procesar si el juego está en curso
    if (gameState.gameStatus !== 'playing') {
      console.log('⏰ Juego no está en curso, omitiendo cronómetro')
      return
    }
    
    // Solo procesar cuando el oponente completa una ronda
    if (!opponentRoundComplete) {
      return
    }
    
    // CRÍTICO: Usar un pequeño delay para asegurar que el estado se haya actualizado
    // Esto es especialmente importante en Azure donde puede haber latencia
    const checkTimer = setTimeout(() => {
      // CRÍTICO: Verificación PRIMERO - comparar valores directamente
      const localAnte = gameState.ante
      const localBlind = gameState.blind
      const oppAnte = opponentAnte
      const oppBlind = opponentBlind
      
      const blindOrder = { small: 1, big: 2, boss: 3 }
      const localBlindOrder = blindOrder[localBlind as keyof typeof blindOrder]
      const oppBlindOrder = blindOrder[oppBlind as keyof typeof blindOrder]
      
      // Verificar si el OPONENTE está adelante (no el jugador local)
      let opponentIsAhead = false
      if (oppAnte > localAnte) {
        opponentIsAhead = true
      } else if (oppAnte === localAnte && oppBlindOrder > localBlindOrder) {
        opponentIsAhead = true
      }
      
      // Verificar si están al mismo nivel
      const sameLevel = oppAnte === localAnte && oppBlindOrder === localBlindOrder
      
      // Verificar si el jugador local está adelante
      const localIsAhead = localAnte > oppAnte || (localAnte === oppAnte && localBlindOrder > oppBlindOrder)
      
      console.log('🔍 VERIFICACIÓN CRÍTICA al recibir ROUND_COMPLETE:', {
        local: { ante: localAnte, blind: localBlind, blindOrder: localBlindOrder },
        opponent: { ante: oppAnte, blind: oppBlind, blindOrder: oppBlindOrder },
        opponentIsAhead,
        localIsAhead,
        sameLevel,
        shouldActivateTimer: opponentIsAhead && !sameLevel && !localIsAhead
      })
      
      // REGLA ABSOLUTA: Si el jugador local está adelante o al mismo nivel, NUNCA activar cronómetro
      if (localIsAhead || sameLevel) {
        // Detener cualquier cronómetro activo inmediatamente
        if (timerRef.current !== null || isOpponentWaiting) {
          console.log('🛑 DETENIENDO cronómetro: jugador local está adelante o al mismo nivel')
          stopTimer()
        }
        console.log('❌ NO se inicia cronómetro: jugador local adelante o mismo nivel')
        return // SALIR INMEDIATAMENTE - no procesar más
      }
      
      // SOLO continuar si el oponente está adelante
      if (!opponentIsAhead) {
        console.log('❌ NO se inicia cronómetro: oponente NO está adelante')
        // Detener cualquier cronómetro activo
        if (timerRef.current !== null || isOpponentWaiting) {
          stopTimer()
        }
        return
      }
      
      // Verificar si el oponente acaba de completar una ronda nueva
      const currentOpponentRound = { ante: oppAnte, blind: oppBlind }
      const isNewRound = !lastOpponentRoundRef.current || 
                         lastOpponentRoundRef.current.ante !== currentOpponentRound.ante ||
                         lastOpponentRoundRef.current.blind !== currentOpponentRound.blind
      
      // SOLO iniciar cronómetro si:
      // 1. El oponente completó una ronda nueva
      // 2. El oponente está adelante (ya verificado arriba)
      // 3. El jugador local está atrás (ya verificado arriba)
      if (isNewRound && opponentIsAhead && !localIsAhead && !sameLevel) {
        lastOpponentRoundRef.current = currentOpponentRound
        
        // Verificación final antes de iniciar
        if (timerRef.current === null && !isOpponentWaiting) {
          console.log('✅ INICIANDO cronómetro: oponente adelante completó nueva ronda, jugador local atrás')
          startTimer()
        } else {
          console.log('⏸️ Cronómetro ya está activo, continuando con tiempo restante')
        }
      } else {
        console.log('❌ NO se inicia cronómetro:', {
          isNewRound,
          opponentIsAhead,
          localIsAhead,
          sameLevel
        })
      }
    }, 100) // Pequeño delay para asegurar que el estado se actualice
    
    return () => {
      clearTimeout(checkTimer)
    }
  }, [opponentRoundComplete, opponentAnte, opponentBlind, gameState.gameStatus, gameState.ante, gameState.blind, isOpponentWaiting, startTimer, stopTimer])
  
  // Ref para rastrear el último progreso conocido (ante/blind) para evitar detener el cronómetro por cambios no relacionados
  const lastProgressRef = useRef<{ localAnte: number; localBlind: string; opponentAnte: number; opponentBlind: string } | null>(null)
  
  // Efecto para mantener/detener el cronómetro según quién esté por delante
  // IMPORTANTE: Solo se detiene cuando cambia el PROGRESO (ante/blind), no por otras actualizaciones (dinero, jokers, etc.)
  useEffect(() => {
    // No hacer nada si estamos inicializando el cronómetro
    if (isInitializingTimerRef.current) {
      return
    }
    
    // Solo procesar si el juego está en curso
    if (gameState.gameStatus !== 'playing') {
      return
    }
    
    // Verificar si realmente cambió el progreso (ante o blind)
    const currentProgress = {
      localAnte: gameState.ante,
      localBlind: gameState.blind,
      opponentAnte: opponentAnte,
      opponentBlind: opponentBlind
    }
    
    const progressChanged = !lastProgressRef.current ||
      lastProgressRef.current.localAnte !== currentProgress.localAnte ||
      lastProgressRef.current.localBlind !== currentProgress.localBlind ||
      lastProgressRef.current.opponentAnte !== currentProgress.opponentAnte ||
      lastProgressRef.current.opponentBlind !== currentProgress.opponentBlind
    
    // Verificación CRÍTICA: Siempre verificar si están al mismo nivel cuando el progreso cambió
    // Esto es importante cuando ambos jugadores completan el boss y avanzan al mismo ante
    if (progressChanged) {
      const blindOrderCheck = { small: 1, big: 2, boss: 3 }
      const localBlindOrderCheck = blindOrderCheck[currentProgress.localBlind as keyof typeof blindOrderCheck]
      const oppBlindOrderCheck = blindOrderCheck[currentProgress.opponentBlind as keyof typeof blindOrderCheck]
      const sameLevelCheck = currentProgress.localAnte === currentProgress.opponentAnte && 
                            localBlindOrderCheck === oppBlindOrderCheck
      
      // Si están al mismo nivel Y hay un cronómetro activo, detenerlo INMEDIATAMENTE
      if (sameLevelCheck && (timerRef.current !== null || isOpponentWaiting)) {
        console.log('🛑 DETENIENDO cronómetro INMEDIATAMENTE: ambos están al mismo nivel', {
          ante: currentProgress.localAnte,
          blind: currentProgress.localBlind,
          opponentAnte: currentProgress.opponentAnte,
          opponentBlind: currentProgress.opponentBlind,
          progressChanged
        })
        stopTimer()
        // Actualizar la referencia después de detener
        lastProgressRef.current = currentProgress
        return
      }
    }
    
    // Actualizar la referencia del progreso
    lastProgressRef.current = currentProgress
    
    // Solo evaluar el cronómetro si realmente cambió el progreso
    if (!progressChanged) {
      return // No hacer nada si el progreso no cambió (por ejemplo, solo cambió el dinero)
    }
    
    // Verificación EXPLÍCITA del progreso usando valores directos
    const localAnte = currentProgress.localAnte
    const localBlind = currentProgress.localBlind
    const oppAnte = currentProgress.opponentAnte
    const oppBlind = currentProgress.opponentBlind
    
    const blindOrder = { small: 1, big: 2, boss: 3 }
    const localBlindOrder = blindOrder[localBlind as keyof typeof blindOrder]
    const oppBlindOrder = blindOrder[oppBlind as keyof typeof blindOrder]
    
    // Verificar si el jugador local está adelante o al mismo nivel
    const localIsAhead = localAnte > oppAnte || (localAnte === oppAnte && localBlindOrder > oppBlindOrder)
    const sameLevel = localAnte === oppAnte && localBlindOrder === oppBlindOrder
    const opponentIsAhead = oppAnte > localAnte || (oppAnte === localAnte && oppBlindOrder > localBlindOrder)
    
    const shouldHaveTimer = opponentIsAhead && !sameLevel && !localIsAhead
    
    console.log('🔍 Verificando cronómetro después de cambio de progreso:', {
      local: { ante: localAnte, blind: localBlind, blindOrder: localBlindOrder },
      opponent: { ante: oppAnte, blind: oppBlind, blindOrder: oppBlindOrder },
      localIsAhead,
      opponentIsAhead,
      sameLevel,
      shouldHaveTimer,
      isOpponentWaiting,
      hasActiveTimer: timerRef.current !== null,
      progressChanged
    })
    
    // CRÍTICO: Si el jugador local está adelante, al mismo nivel, o el oponente ya no está adelante, DETENER el cronómetro
    // Esto incluye el caso especial de cuando ambos están en "boss" (mismo nivel)
    // Y especialmente cuando el jugador local pasa de boss y alcanza al oponente (mismo nivel en el siguiente ante)
    if ((localIsAhead || sameLevel || !opponentIsAhead) && (isOpponentWaiting || timerRef.current !== null)) {
      console.log('🛑 DETENIENDO cronómetro: jugador local alcanzó, superó o está al mismo nivel que el oponente', {
        localIsAhead,
        sameLevel,
        opponentIsAhead,
        shouldHaveTimer,
        reason: localIsAhead ? 'jugador local adelante' : sameLevel ? 'mismo nivel' : 'oponente no adelante',
        local: { ante: localAnte, blind: localBlind },
        opponent: { ante: oppAnte, blind: oppBlind }
      })
      stopTimer()
    }
    
    // VERIFICACIÓN ADICIONAL: Si están al mismo nivel y hay un cronómetro activo, detenerlo inmediatamente
    // Esto es especialmente importante después de completar el boss cuando ambos avanzan al mismo ante
    if (sameLevel && (timerRef.current !== null || isOpponentWaiting)) {
      console.log('🛑 DETENIENDO cronómetro: AMBOS están al mismo nivel (ante y blind iguales)', {
        ante: localAnte,
        blind: localBlind,
        opponentAnte: oppAnte,
        opponentBlind: oppBlind
      })
      stopTimer()
    }
    
    // IMPORTANTE: NUNCA iniciar el cronómetro desde este efecto
    // El cronómetro solo se inicia cuando el oponente completa una ronda nueva Y el jugador local está por detrás
  }, [gameState.gameStatus, gameState.ante, gameState.blind, opponentAnte, opponentBlind, isOpponentWaiting, isOpponentAhead, stopTimer])

  // Perder automáticamente si el cronómetro llega a 0
  useEffect(() => {
    if (roundTimer === 0 && isOpponentWaiting && gameState.gameStatus === 'playing' && !lostByTimeout) {
      console.log('⏰ Tiempo agotado! El jugador pierde automáticamente.')
      
      // Limpiar timer
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      
      // Marcar como perdido por timeout
      setLostByTimeout(true)
      
      // Marcar el juego como perdido
      game.loseGame('timeout')
      
      // Notificar al oponente que perdimos y que él ganó
      if (gameId) {
        console.log('📤 Enviando mensajes de fin de partida por timeout...')
        
        // Enviar GAME_LOST para indicar que el jugador local perdió
        gameMessageService.sendGameMessage(
          {
            action: 'GAME_LOST',
            data: {
              reason: 'timeout',
              ante: gameState.ante,
              blind: gameState.blind,
              score: gameState.currentRound.score
            }
          },
          MessageType.GAME_LOST
        )
        console.log('✅ GAME_LOST enviado (jugador local perdió por timeout)')
        
        // Enviar GAME_WON al oponente para indicar que ganó porque el jugador local se quedó sin tiempo
        // IMPORTANTE: Este mensaje debe ser procesado por el oponente como su victoria
        gameMessageService.sendGameMessage(
          {
            action: 'GAME_WON',
            data: {
              reason: 'opponent_timeout',
              message: 'El oponente se quedó sin tiempo',
              ante: gameState.ante,
              blind: gameState.blind,
              score: gameState.currentRound.score
            }
          },
          MessageType.GAME_WON
        )
        console.log('✅ GAME_WON enviado (oponente ganó porque jugador local perdió por timeout)')
      }
      
      setIsOpponentWaiting(false)
      setRoundTimer(null)
    }
  }, [roundTimer, isOpponentWaiting, gameState.gameStatus, gameId, gameState.ante, gameState.blind, gameState.currentRound.score, lostByTimeout, game])

  // Notificaciones cuando el oponente gana
  useEffect(() => {
    if (opponentGameWon) {
      addNotification(`🏆 ${opponentName} ganó el juego!`, 'opponent', 10000)
    }
  }, [opponentGameWon, opponentName, addNotification])

  // Notificaciones cuando el oponente pierde
  useEffect(() => {
    if (opponentGameLost) {
      addNotification(`💀 ${opponentName} perdió el juego!`, 'opponent', 10000)
    }
  }, [opponentGameLost, opponentName, addNotification])

  // Detectar efectos de cartas al jugar
  useEffect(() => {
    if (selectedCards.length > 0) {
      const effects = calculateAllCardEffects(selectedCards)
      
      if (effects.totalMoney > 0) {
        addNotification(`+$${effects.totalMoney} de cartas Gold!`, 'gold', 2500)
      }
      
      if (effects.brokenCards.length > 0) {
        const cardNames = effects.brokenCards.map(c => c.rank).join(', ')
        addNotification(`💥 ${cardNames} se rompió!`, 'glass', 2500)
      }
    }
  }, [gameState.currentRound.score])

  const handleSendChat = () => {
    if (chatInput.trim()) {
      sendChatMessage(chatInput)
      setChatInput('')
    }
  }

  const handleAddTestJoker = () => {
    const randomJoker = getRandomJoker()
    const jokerInstance = createJokerInstance(randomJoker as any)
    const added = addJoker(jokerInstance)
    if (!added) {
      alert('No hay espacio para más Jokers (máximo 5)')
    }
  }

  const handleExit = () => {
    if (confirm('¿Estás seguro de que quieres salir de la partida?')) {
      nav('/multiplayer')
    }
  }

  // -----------------------
  // PANTALLA DE VICTORIA
  // -----------------------
  if (gameState.gameStatus === 'won') {
    const interest = calculateInterest(gameState.money)
    
    if (showShop) {
      const handleBuyItem = (item: ShopItem): boolean => {
        const success = buyShopItem(item)
        if (success) {
          const itemName = item.joker?.name || item.enhancement?.name || 'item'
          sendGameAction('BUY_ITEM', {
            itemName,
            newMoney: gameState.money - item.cost
          })
        }
        return success
      }

      const handleReroll = (cost: number): boolean => {
        return rerollShop(cost)
      }

      const handleSkipShop = () => {
        setShowShop(false)
        
        // Resetear la referencia para permitir enviar ROUND_COMPLETE de la nueva ronda
        lastRoundCompleteRef.current = null
        console.log('🔄 Avanzando de ronda, resetando lastRoundCompleteRef')
        
        // NOTA: NO limpiamos el cronómetro aquí porque el efecto que verifica
        // si el oponente está por delante se encargará de detenerlo si alcanzamos al oponente
        // Si todavía estamos por detrás, el cronómetro debe continuar
        
        advanceRound()
      }

      return (
        <BackgroundWrapper image={playBg}>
          <Shop
            ante={gameState.ante}
            money={gameState.money}
            onBuyItem={handleBuyItem}
            onReroll={handleReroll}
            onSkip={handleSkipShop}
          />
        </BackgroundWrapper>
      )
    }
    
    return (
      <BackgroundWrapper image={playBg}>
        <div className="jugarDivVictoria">
          <h1>¡VICTORIA!</h1>
          <h2>{blindInfo.name} Completado</h2>

          <div className="victory-info">
            <div className='jugarRecursos'>
              <p className="jugarRecursoNombre">Puntuación:</p>
              <p className="jugarRecursoValor">{gameState.currentRound.score} / {blindInfo.scoreNeeded}</p>
            </div>
            <div className='jugarRecursos'>
              <p className="jugarRecursoNombre">Recompensa:</p>
              <p className="jugarRecursoValor">+${blindInfo.reward}</p>
            </div>
            <div className='jugarRecursos'>
              <p className="jugarRecursoNombre">Interés:</p>
              <p className="jugarRecursoValor">+${interest}</p>
            </div>
            <div className='jugarRecursos'>
              <p className="jugarRecursoNombre">Dinero Total:</p>
              <p className="jugarRecursoValor">${gameState.money + interest}</p>
            </div>
          </div>

          <div className="jugarVictoriaAcciones">
             <button className="buttonRed" onClick={handleExit}>
              Salir
            </button>

            <button className="buttonBlue" onClick={() => setShowShop(true)}>
              Ir a la Tienda
            </button>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  // -----------------------
  // PANTALLA DE FIN DE PARTIDA
  // -----------------------
  if (gameState.gameStatus === 'lost' || lostByTimeout || opponentGameLost || opponentGameWon) {
    // PRIORIDAD: Si el jugador local perdió (por timeout o por otra razón), siempre mostrar derrota
    // Si el oponente perdió, mostrar victoria
    // Si el oponente ganó, mostrar derrota
    const localPlayerLost = gameState.gameStatus === 'lost' || lostByTimeout
    const isWinner = !localPlayerLost && opponentGameLost // Solo ganamos si NO perdimos Y el oponente perdió
    const isLoser = localPlayerLost || opponentGameWon // Perdemos si perdimos localmente O el oponente ganó
    
    return (
      <BackgroundWrapper image={playBg}>
        <div className={isWinner ? 'jugarDivVictoria' : 'jugarDivDerrota'}>
          <h1>{isWinner ? '🏆 ¡VICTORIA!' : '💀 GAME OVER'}</h1>
          <h2>
            {isWinner 
              ? `¡Has ganado la partida!` 
              : opponentGameWon 
                ? `${opponentName} ganó la partida` 
                : 'Has perdido la partida'}
          </h2>
          
          <div className="victory-info">
            <div className='jugarRecursos'>
              <p className="jugarRecursoNombre">Tu Puntuación Final:</p>
              <p className="jugarRecursoValor">{gameState.currentRound.score} / {blindInfo.scoreNeeded}</p>
            </div>
            <div className='jugarRecursos'>
              <p className="jugarRecursoNombre">Puntuación del Oponente:</p>
              <p className="jugarRecursoValor">{opponentScore}</p>
            </div>
            <div className='jugarRecursos'>
              <p className="jugarRecursoNombre">Ante alcanzado:</p>
              <p className="jugarRecursoValor">{gameState.ante}</p>
            </div>
            {/* Mostrar razón solo si el jugador local perdió */}
            {isLoser && !isWinner && (
              <div className='jugarRecursos'>
                <p className="jugarRecursoNombre">Razón:</p>
                <p className="jugarRecursoValor">
                  {lostByTimeout 
                    ? 'Tiempo agotado' 
                    : opponentGameWon && opponentGameWonReason
                      ? opponentGameWonReason
                      : gameState.currentRound.handsRemaining <= 0 
                        ? 'Te quedaste sin manos' 
                        : 'Perdiste'}
                </p>
              </div>
            )}
            {/* Mostrar razón de victoria si el jugador local ganó */}
            {isWinner && opponentGameLost && (
              <div className='jugarRecursos'>
                <p className="jugarRecursoNombre">Razón:</p>
                <p className="jugarRecursoValor">
                  {opponentNoHandsInfo 
                    ? 'El oponente se quedó sin manos' 
                    : 'El oponente se quedó sin tiempo'}
                </p>
              </div>
            )}
          </div>

          <div className="jugarVictoriaAcciones">
            <button className="buttonGreen" onClick={handleExit}>
              Salir
            </button>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  // -----------------------
  // JUEGO NORMAL MULTIJUGADOR
  // -----------------------
  
  // Log para detectar cuándo VoiceControls se renderiza/desmonta
  const shouldRenderVoiceControls = gameId && localCognitoUsername && remoteCognitoUsername
  useEffect(() => {
    console.log('🎙️ [PlayMultiplayer] VoiceControls render condition changed:', {
      shouldRender: shouldRenderVoiceControls,
      gameId,
      localCognitoUsername,
      remoteCognitoUsername,
      WARNING: shouldRenderVoiceControls ? '✅ RENDERIZANDO VoiceControls' : '❌ NO RENDERIZANDO (DESMONTADO)'
    })
  }, [shouldRenderVoiceControls, gameId, localCognitoUsername, remoteCognitoUsername])
  
  return (
    <BackgroundWrapper image={playBg}>
      {/* Controles de Chat de Voz */}
      {shouldRenderVoiceControls && (
        <VoiceControls
          gameId={gameId}
          localCognitoUsername={localCognitoUsername}
          remoteCognitoUsername={remoteCognitoUsername}
        />
      )}

      {/* CRONÓMETRO CUANDO EL OPONENTE COMPLETÓ LA RONDA - FUERA DEL DIV PRINCIPAL */}
      {isOpponentWaiting && roundTimer !== null && roundTimer >= 0 && (
        <div 
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: roundTimer <= 5 ? '#ff4444' : '#ffaa00',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '20px',
            fontWeight: 'bold',
            zIndex: 10000,
            boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
            textAlign: 'center',
            minWidth: '300px',
            pointerEvents: 'none'
          }}
        >
          ⏰ {roundTimer}s para avanzar
        </div>
      )}

      <div className="jugarDivPrincipal">

        {/* HEADER */}
        <h1>
          Ante {gameState.ante} - {blindInfo.name}
          <span>
            {isConnected ? '🟢' : '🔴'}
          </span>
        </h1>

        <div className='jugarDivDivision'>
          
          {/* IZQUIERDA: JUGADOR (TÚ) */}
          <div className='jugarTablaInformacion'>
            <div className="jugarRecursoNombre">TÚ</div>
            
            <div className="jugarRecursoNombre">Objetivo</div>
            <div className="jugarRecursoValor">{gameState.currentRound.score} / {blindInfo.scoreNeeded}</div>
            <div className="jugarRecursoProgreso" style={{ width: `${blindInfo.progress}%` }}></div>
            <div className='jugarRecursoDivision'></div>

            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Manos</div>
              <div className="jugarRecursoValor">{gameState.currentRound.handsRemaining}</div>
            </div>

            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Descartes</div>
              <div className="jugarRecursoValor">{gameState.currentRound.discardsRemaining}</div>
            </div>

            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Dinero</div>
              <div className="jugarRecursoValor">${gameState.money}</div>
            </div>
          </div>

          {/* CENTRO: ZONA DE JUEGO */}
          <div className='jugarZonaJuego'>
            
            {/* INFO DE MANO */}
            <div className={`panel handinfo-panel ${currentHandScore ? 'handinfo-active' : ''}`}>
              {currentHandScore ? (
                <>
                  {POKER_HANDS[currentHandScore.handType].name} -
                  <span className="handinfo-score">{currentHandScore.score} pts</span>
                  ({currentHandScore.chips} × {currentHandScore.multiplier})
                </>
              ) : (
                'Selecciona cartas'
              )}
            </div>

            {/* JOKERS */}
            {gameState.jokers.length > 0 && (
              <div className="jokers-section">
                <div className="jokers-title">
                  Jokers ({gameState.jokers.length}/{gameState.maxJokers})
                </div>
                <div className="jokers-list">
                  {gameState.jokers.map(joker => (
                    <div key={joker.instanceId} className="joker-wrapper">
                      <JokerCard joker={joker} size="medium" />
                      <button
                        className="joker-sell-btn"
                        onClick={() => {
                          const sellPrice = Math.floor(joker.cost / 2)
                          if (confirm(`¿Vender ${joker.name} por $${sellPrice}?`)) {
                            sellJoker(joker.instanceId)
                          }
                        }}
                        title={`Vender por $${Math.floor(joker.cost / 2)}`}
                      >
                        Vender
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CARTAS (MAZO) */}
            <div className="jugarMazo">
              {gameState.hand.map(card => (
                <Card 
                  key={card.id} 
                  card={card} 
                  onClick={() => selectCard(card.id)} 
                />
              ))}
            </div>
          </div>

          {/* DERECHA: OPONENTE */}
          <div className='jugarTablaInformacion'>
            <div className="jugarRecursoNombre">
              {opponentName || 'Oponente'}
            </div>
            
            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Score</div>
              <div className="jugarRecursoValor">{opponentScore}</div>
            </div>
             {/* Barra de progreso visual simple para el oponente basada en el mismo objetivo */}
             <div className="jugarRecursoProgreso" style={{ width: `${Math.min((opponentScore / blindInfo.scoreNeeded) * 100, 100)}%` }}></div>
            <div className='jugarRecursoDivision'></div>

            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Manos</div>
              <div className="jugarRecursoValor">{opponentHands}</div>
            </div>

            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Descartes</div>
              <div className="jugarRecursoValor">{opponentDiscards}</div>
            </div>

            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Dinero</div>
              <div className="jugarRecursoValor">${opponentMoney}</div>
            </div>
          </div>

        </div>

        {/* BOTONES ACCIONES */}
        <div className="jugarBottonesAcciones">
          <button className="buttonBlue" onClick={() => {
              discardSelectedCards()
              sendGameAction('DISCARD', {
                discardsRemaining: gameState.currentRound.discardsRemaining - 1
              })
            }} disabled={!canDiscard}>
            Descartar ({gameState.currentRound.discardsRemaining})
          </button>

          <button className="buttonGreen" onClick={() => {
              playSelectedHand()
              if (currentHandScore) {
                sendGameAction('PLAY_HAND', {
                  handType: POKER_HANDS[currentHandScore.handType].name,
                  newScore: gameState.currentRound.score + currentHandScore.score,
                  handsRemaining: gameState.currentRound.handsRemaining - 1
                })
              }
            }} disabled={!canPlay}>
            Jugar Mano ({gameState.currentRound.handsRemaining})
          </button>
          
          {/*
          <button className="buttonBlue" onClick={() => setShowChat(!showChat)}>
            💬 Chat
            {hasUnreadMessages && (
              <span></span>
            )}
          </button> */}

          {/*
           <button className="buttonBlue" onClick={handleAddTestJoker}>
            + Joker (Test)
          </button>*/}

          
        </div>
        <button className="buttonRed" onClick={handleExit}>
            Salir
          </button>

        {/* CHAT FLOTANTE / PANEL */}
        {showChat && (
          <div className="panel">
            <h3>Chat</h3>
            <div>
              {chatMessages.map((msg, idx) => (
                <div key={idx}>
                  <b>{msg.playerId === playerId ? 'Tú' : opponentName}:</b> {msg.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div>
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="..."
              />
              <button onClick={handleSendChat}>
                ➤
              </button>
            </div>
          </div>
        )}

      </div>

      {/* NOTIFICACIONES */}
      {notifications.map(notification => (
        <FloatingNotification
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </BackgroundWrapper>
  )
}

// Wrapper que maneja la inicialización
export default function PlayMultiplayer() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const gameId = searchParams.get('gameId') || ''
  const playerId = searchParams.get('playerId') || ''

  useEffect(() => {
    // Si no hay gameId o playerId, redirigir al menú
    if (!gameId || !playerId) {
      nav('/multiplayer')
    }
  }, [gameId, playerId, nav])

  if (!gameId || !playerId) {
    return null
  }

  return <PlayMultiplayerGame />
}