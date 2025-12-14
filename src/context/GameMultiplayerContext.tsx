/**
 * Context API para el modo multijugador
 * Extiende GameContext y añade sincronización WebSocket
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { GameProvider, useGame } from './GameContext'
import { useAuth } from './AuthContext'
import type { GameMessage } from '../types/backend'
import { MessageType } from '../types/backend'
import { gameMessageService } from '../services/GameMessageService'
import { webSocketService } from '../services/WebSocketService'
import { getNextBlind } from '../types/game'

interface GameMultiplayerContextValue {
  // Estado del juego propio (heredado de GameContext)
  game: ReturnType<typeof useGame>
  
  // Info del oponente
  opponentId: string
  opponentName: string
  opponentScore: number
  opponentMoney: number
  opponentHands: number
  opponentDiscards: number
  
  // Estado multijugador
  gameId: string
  playerId: string
  isMyTurn: boolean
  gameMessages: GameMessage[]
  chatMessages: { playerId: string, text: string, timestamp: number }[]
  
  // Acciones multijugador
  sendChatMessage: (text: string) => void
  sendGameAction: (action: string, data: any) => void
  
  // Notificaciones
  lastOpponentAction: string | null
  
  // Eventos de juego del oponente
  opponentRoundComplete: boolean
  opponentGameWon: boolean
  opponentGameLost: boolean
  opponentGameWonReason: string | null
  opponentAnte: number
  opponentBlind: 'small' | 'big' | 'boss'
  opponentNoHandsInfo: { ante: number; blind: string } | null
}

const GameMultiplayerContext = createContext<GameMultiplayerContextValue | null>(null)

interface GameMultiplayerProviderProps {
  readonly children: ReactNode
  readonly gameId: string
  readonly playerId: string
  readonly opponentId: string
  readonly opponentName?: string
}

function GameMultiplayerProviderInner({ 
  children, 
  gameId, 
  playerId,
  opponentId,
  opponentName = 'Oponente'
}: GameMultiplayerProviderProps) {
  const game = useGame()
  const { getAccessToken, isAuthenticated } = useAuth()
  
  // Estado del oponente
  const [opponentScore, setOpponentScore] = useState(0)
  const [opponentMoney, setOpponentMoney] = useState(0)
  const [opponentHands, setOpponentHands] = useState(4)
  const [opponentDiscards, setOpponentDiscards] = useState(3)
  const [opponentAnte, setOpponentAnte] = useState(1)
  const [opponentBlind, setOpponentBlind] = useState<'small' | 'big' | 'boss'>('small')
  
  // Estado multijugador
  const [gameMessages, setGameMessages] = useState<GameMessage[]>([])
  const [chatMessages, setChatMessages] = useState<{ playerId: string, text: string, timestamp: number }[]>([])
  const [lastOpponentAction, setLastOpponentAction] = useState<string | null>(null)
  const [isMyTurn] = useState(true) // Por ahora, siempre es el turno del jugador (juego simultáneo)
  
  // Eventos de juego del oponente
  const [opponentRoundComplete, setOpponentRoundComplete] = useState(false)
  const [opponentGameWon, setOpponentGameWon] = useState(false)
  const [opponentGameLost, setOpponentGameLost] = useState(false)
  const [opponentGameWonReason, setOpponentGameWonReason] = useState<string | null>(null)
  const [opponentNoHandsInfo, setOpponentNoHandsInfo] = useState<{ ante: number; blind: string } | null>(null)

  // Estado de conexión
  const [isWebSocketReady, setIsWebSocketReady] = useState(false)

  // Conectar WebSocket al montar
  // IMPORTANTE: Solo crear una conexión WebSocket por usuario
  useEffect(() => {
    let isMounted = true;
    
    const connectWebSocket = async () => {
      try {
        // Si ya está conectado con el mismo playerId, reutilizar la conexión
        if (webSocketService.isWebSocketConnected()) {
          const currentPlayerId = webSocketService.getPlayerId();
          if (currentPlayerId === playerId) {
            console.log('✅ WebSocket ya está conectado para este jugador, reutilizando conexión');
            setIsWebSocketReady(true);
            return;
          } else {
            console.log('⚠️ WebSocket conectado pero con diferente playerId, cerrando conexión anterior...');
            await webSocketService.disconnect();
            // Esperar un momento antes de crear nueva conexión
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        // Si no está conectado, conectar con autenticación
        console.log('🔌 Conectando WebSocket...');
        
        // Obtener token JWT si el usuario está autenticado
        let accessToken: string | null = null;
        if (isAuthenticated) {
          try {
            accessToken = await getAccessToken();
            if (accessToken) {
              console.log('🔐 Token obtenido correctamente para WebSocket en GameMultiplayerContext');
              console.log('🔐 Token (primeros 20 caracteres):', accessToken.substring(0, 20) + '...');
            } else {
              console.warn('⚠️ No se pudo obtener el token de acceso. Intentando conectar sin autenticación.');
            }
          } catch (tokenError) {
            console.error('❌ Error al obtener token:', tokenError);
            console.warn('⚠️ Intentando conectar sin autenticación.');
          }
        } else {
          console.warn('⚠️ Usuario no autenticado. Conectando sin token.');
        }
        
        await webSocketService.connect(playerId, accessToken);
        
        if (isMounted) {
          setIsWebSocketReady(true);
          console.log('✅ WebSocket conectado y listo');
        }
      } catch (error) {
        console.error('❌ Error al conectar WebSocket:', error);
        if (isMounted) {
          setIsWebSocketReady(false);
        }
      }
    }
    
    connectWebSocket();
    
    // Cleanup: no desconectar aquí porque otros componentes pueden estar usando la misma conexión
    return () => {
      isMounted = false;
    };
  }, [playerId, isAuthenticated, getAccessToken])

  // Unirse al juego SOLO cuando el WebSocket esté listo
  useEffect(() => {
    if (!isWebSocketReady) {
      console.log('⏳ Esperando conexión WebSocket...')
      return
    }
    
    console.log(`🎮 WebSocket listo, uniéndose a la partida: ${gameId}`)
    gameMessageService.joinGame(gameId, playerId)
    console.log(`✅ Unido a la partida multijugador: ${gameId}`)
    
    return () => {
      gameMessageService.leaveGame()
    }
  }, [gameId, playerId, isWebSocketReady])

  // Escuchar mensajes del juego SOLO cuando esté listo
  useEffect(() => {
    if (!isWebSocketReady) {
      return
    }
    
    // Handler para mensajes de juego
    const handleGameMessage = (message: GameMessage) => {
      console.log('🎮 Mensaje de juego recibido en contexto:', {
        type: message.type,
        playerId: message.playerId,
        localPlayerId: playerId,
        payload: message.payload
      })
      setGameMessages(prev => [...prev, message])
      
      // Procesar eventos especiales del oponente (ROUND_COMPLETE, GAME_WON, GAME_LOST)
      // GAME_WON y GAME_LOST pueden venir del oponente (indicando que el oponente ganó/perdió)
      // o pueden venir del jugador local (indicando que el jugador local ganó/perdió, por lo que el oponente perdió/ganó)
      
      // Procesar ROUND_COMPLETE solo si viene del oponente
      if (message.playerId !== playerId) {
        // Verificar si es un ROUND_COMPLETE por tipo o por action
        const isRoundComplete = message.type === MessageType.ROUND_COMPLETE || 
                                (message.type === MessageType.GAME_MESSAGE && 
                                 message.payload?.action === 'ROUND_COMPLETE')
        
        if (isRoundComplete) {
          console.log('🎉 El oponente completó una ronda!', {
            messageType: message.type,
            payload: message.payload
          })
          // Actualizar ante y blind del oponente desde el payload
          // El payload contiene el blind que acaba de completar, necesitamos calcular el siguiente
          const payloadData = message.payload?.data || message.payload
          if (payloadData) {
            const { ante, blind } = payloadData
            console.log(`📊 ROUND_COMPLETE recibido - Ante: ${ante}, Blind: ${blind}`)
            if (ante !== undefined && blind) {
              // Calcular el siguiente blind después de completar
              const next = getNextBlind(blind as 'small' | 'big' | 'boss', ante)
              setOpponentAnte(next.ante)
              setOpponentBlind(next.blind)
              console.log(`📊 Oponente progreso actualizado: Ante ${next.ante}, Blind ${next.blind} (completó ${blind} en ante ${ante})`)
            }
          } else {
            console.warn('⚠️ ROUND_COMPLETE sin payload.data:', message.payload)
          }
          setOpponentRoundComplete(true)
          console.log('✅ opponentRoundComplete establecido a true')
          setTimeout(() => {
            console.log('⏱️ opponentRoundComplete establecido a false después de 5 segundos')
            setOpponentRoundComplete(false)
          }, 5000)
        }
        
        // Procesar GAME_LOST del oponente (el oponente perdió, yo gané)
        // IMPORTANTE: Solo procesar si el mensaje viene del oponente
        if (message.type === MessageType.GAME_LOST && message.playerId !== playerId) {
          const lostPayload = message.payload?.data || message.payload
          
          // Si el mensaje tiene reason: 'timeout', significa que el oponente perdió por tiempo
          // En este caso, el jugador local ganó, así que debemos enviar un mensaje de victoria
          if (lostPayload?.reason === 'timeout') {
            console.log('⏰ El oponente se quedó sin tiempo! El jugador local ganó!', lostPayload)
            setOpponentGameLost(true)
            
            // IMPORTANTE: Enviar mensaje de victoria al oponente para notificar que el jugador local ganó
            // El backend debe reenviar este mensaje al oponente (message.playerId del oponente)
            // El mensaje tiene el playerId del jugador local (el que ganó)
            console.log('📤 Enviando GAME_WON al backend para notificar victoria...')
            gameMessageService.sendGameMessage(
              {
                action: 'GAME_WON',
                data: {
                  reason: 'opponent_timeout',
                  message: 'El oponente se quedó sin tiempo',
                  ante: lostPayload?.ante || game.gameState.ante,
                  blind: lostPayload?.blind || game.gameState.blind,
                  score: lostPayload?.score || game.gameState.currentRound.score,
                  // Incluir información del oponente que perdió para que el backend sepa a quién notificar
                  opponentId: message.playerId,
                  winnerId: playerId
                }
              },
              MessageType.GAME_WON
            )
            console.log('✅ GAME_WON enviado al backend (jugador local ganó porque oponente perdió por timeout)')
            console.log('⚠️ NOTA: El backend debe reenviar este mensaje al oponente para que reciba la notificación de derrota')
          } else if (lostPayload?.reason === 'no_hands') {
            // El oponente se quedó sin manos - NO declarar victoria inmediatamente
            // Necesitamos verificar el progreso para determinar cuándo declarar victoria
            console.log('💀 El oponente se quedó sin manos en Ante', lostPayload?.ante, 'Blind', lostPayload?.blind)
            setOpponentNoHandsInfo({ ante: lostPayload?.ante || 1, blind: lostPayload?.blind || 'small' })
            // No establecer opponentGameLost todavía, se determinará según el progreso
          } else {
            // El oponente perdió por otra razón (no timeout, no no_hands)
            console.log('💀 El oponente perdió el juego!', lostPayload)
            setOpponentGameLost(true)
          }
        }
      }
      
      // Procesar GAME_WON
      // IMPORTANTE: Cuando un jugador pierde por timeout, envía GAME_WON con reason: 'opponent_timeout'
      // El playerId en el mensaje es el del jugador que perdió
      // Si el mensaje viene del jugador local (message.playerId === playerId), significa que el jugador local perdió
      // Si el mensaje viene del oponente (message.playerId !== playerId), significa que el oponente perdió
      if (message.type === MessageType.GAME_WON) {
        const wonPayload = message.payload?.data || message.payload
        
        console.log('🏆 GAME_WON recibido:', {
          messagePlayerId: message.playerId,
          localPlayerId: playerId,
          reason: wonPayload?.reason,
          isFromLocalPlayer: message.playerId === playerId,
          isFromOpponent: message.playerId !== playerId,
          payload: wonPayload
        })
        
        // Si el mensaje tiene reason: 'opponent_no_hands' (el oponente se quedó sin manos)
        if (wonPayload?.reason === 'opponent_no_hands') {
          // Si el mensaje viene del jugador local, significa que el jugador local ganó
          if (message.playerId === playerId) {
            console.log('🏆 ¡VICTORIA! El jugador local ganó porque el oponente se quedó sin manos!', message.payload)
            setOpponentGameLost(true)
          }
        }
        // Si el mensaje tiene reason: 'opponent_timeout'
        else if (wonPayload?.reason === 'opponent_timeout') {
          // IMPORTANTE: Si el mensaje viene del jugador local (message.playerId === playerId),
          // significa que el jugador local envió este mensaje porque perdió por timeout
          // Este mensaje está destinado al OPONENTE, no al jugador local
          // Por lo tanto, debemos IGNORAR este mensaje cuando viene del jugador local
          // porque el jugador local ya sabe que perdió (a través de lostByTimeout o gameState.gameStatus === 'lost')
          if (message.playerId === playerId) {
            console.log('⚠️ Ignorando GAME_WON propio: El jugador local perdió por timeout, este mensaje es para el oponente', message.payload)
            // NO establecer opponentGameWon aquí porque el jugador local perdió, no ganó
            // El estado de derrota ya está manejado por lostByTimeout en PlayMultiplayer
            return // Ignorar este mensaje
          } 
          // Si el mensaje viene del oponente (message.playerId !== playerId),
          // significa que el oponente perdió por timeout, por lo que el jugador local ganó
          else {
            console.log('🏆 ¡VICTORIA! El jugador local ganó porque el oponente se quedó sin tiempo!', message.payload)
            setOpponentGameLost(true)
            
            // NOTA: Si recibimos GAME_WON del oponente con reason: 'opponent_timeout',
            // significa que el oponente ya sabe que perdió y nos está notificando
            // No necesitamos enviar otro mensaje de vuelta, ya que esto crearía un bucle
            // El mensaje GAME_WON del oponente ya indica que el jugador local ganó
            console.log('✅ Mensaje GAME_WON recibido del oponente confirmando su derrota por timeout')
          }
        }
        // Si el mensaje viene del oponente y no es por timeout, el oponente ganó por otra razón
        else if (message.playerId !== playerId) {
          console.log('🏆 El oponente ganó el juego!', message.payload)
          setOpponentGameWon(true)
          if (wonPayload?.message) {
            setOpponentGameWonReason(wonPayload.message)
          } else {
            setOpponentGameWonReason(null)
          }
        }
      }
      
      // Procesar acciones del oponente
      if (message.playerId !== playerId && message.payload) {
        const { action, data } = message.payload
        
        console.log('👥 Acción del oponente:', action, data)
        
        switch (action) {
          case 'PLAY_HAND':
            setOpponentScore(data.newScore || 0)
            setOpponentHands(data.handsRemaining || 0)
            // No mostrar notificación de acciones del oponente
            break
            
          case 'DISCARD':
            setOpponentDiscards(data.discardsRemaining || 0)
            // No mostrar notificación de acciones del oponente
            break
            
          case 'BUY_ITEM':
            setOpponentMoney(data.newMoney || 0)
            // No mostrar notificación de acciones del oponente
            break
            
          case 'UPDATE_STATE':
            // IMPORTANTE: Solo actualizar ante/blind si realmente cambiaron
            // Esto evita que comprar jokers (que solo cambia money) afecte el cronómetro
            if (data.score !== undefined) setOpponentScore(data.score)
            if (data.money !== undefined) setOpponentMoney(data.money)
            if (data.hands !== undefined) setOpponentHands(data.hands)
            if (data.discards !== undefined) setOpponentDiscards(data.discards)
            // Solo actualizar ante/blind si los valores son diferentes a los actuales
            // Esto previene actualizaciones innecesarias que podrían detener el cronómetro incorrectamente
            if (data.ante !== undefined && data.ante !== opponentAnte) {
              console.log(`📊 Actualizando ante del oponente: ${opponentAnte} -> ${data.ante}`)
              setOpponentAnte(data.ante)
            }
            if (data.blind !== undefined && data.blind !== opponentBlind) {
              console.log(`📊 Actualizando blind del oponente: ${opponentBlind} -> ${data.blind}`)
              setOpponentBlind(data.blind)
            }
            break
        }
      }
    }
    
    // Handler para mensajes de chat
    const handleChatMessage = (message: GameMessage) => {
      console.log('💬 Mensaje de chat recibido en contexto:', message)
      
      // Verificar si el mensaje viene con el texto en 'message' o 'payload.text'
      const text = message.message || message.payload?.text
      
      if (message.playerId && text) {
        setChatMessages(prev => [...prev, {
          playerId: message.playerId!,
          text,
          timestamp: Date.now()
        }])
      }
    }
    
    // Registrar los callbacks
    gameMessageService.onGameMessage(handleGameMessage)
    gameMessageService.onChatMessage(handleChatMessage)
    
    console.log('✅ Callbacks de mensajes registrados')
  }, [playerId, isWebSocketReady])

  // Enviar acción de juego al oponente
  const sendGameAction = useCallback((action: string, data: any) => {
    if (!isWebSocketReady || !webSocketService.isWebSocketConnected()) {
      console.warn('⚠️ No se puede enviar acción: WebSocket no está conectado')
      return
    }
    
    console.log('📤 Enviando acción de juego:', action, data)
    gameMessageService.sendGameMessage({
      action,
      data: {
        ...data,
        playerId
      }
    })
  }, [playerId, isWebSocketReady])

  // Enviar mensaje de chat
  const sendChatMessage = useCallback((text: string) => {
    if (!isWebSocketReady || !webSocketService.isWebSocketConnected()) {
      console.warn('⚠️ No se puede enviar chat: WebSocket no está conectado')
      return
    }
    
    console.log('📤 Enviando mensaje de chat:', text)
    gameMessageService.sendChatMessage(text)
    
    // ✅ NO agregamos el mensaje localmente
    // El mensaje llegará de vuelta desde el servidor y se agregará en el callback
    // Esto evita duplicados y asegura que ambos jugadores vean los mensajes igual
  }, [isWebSocketReady])

  // Sincronizar acciones propias con el backend
  useEffect(() => {
    // Cuando se juega una mano, notificar al oponente
    const score = game.gameState.currentRound.score
    const hands = game.gameState.currentRound.handsRemaining
    const money = game.gameState.money
    
    if (score > 0) {
      sendGameAction('UPDATE_STATE', {
        score,
        money,
        hands,
        discards: game.gameState.currentRound.discardsRemaining,
        ante: game.gameState.ante,
        blind: game.gameState.blind
      })
    }
  }, [
    game.gameState.currentRound.score,
    game.gameState.currentRound.handsRemaining,
    game.gameState.money,
    game.gameState.ante,
    game.gameState.blind,
    sendGameAction
  ])

  const value: GameMultiplayerContextValue = useMemo(() => ({
    game,
    opponentId,
    opponentName,
    opponentScore,
    opponentMoney,
    opponentHands,
    opponentDiscards,
    gameId,
    playerId,
    isMyTurn,
    gameMessages,
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
  }), [
    game,
    opponentId,
    opponentName,
    opponentScore,
    opponentMoney,
    opponentHands,
    opponentDiscards,
    gameId,
    playerId,
    isMyTurn,
    gameMessages,
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
  ])

  return (
    <GameMultiplayerContext.Provider value={value}>
      {children}
    </GameMultiplayerContext.Provider>
  )
}

// Provider principal que envuelve con GameProvider
export function GameMultiplayerProvider(props: GameMultiplayerProviderProps) {
  return (
    <GameProvider>
      <GameMultiplayerProviderInner {...props} />
    </GameProvider>
  )
}

// Hook para usar el contexto multijugador
export function useGameMultiplayer() {
  const context = useContext(GameMultiplayerContext)
  if (!context) {
    throw new Error('useGameMultiplayer debe usarse dentro de un GameMultiplayerProvider')
  }
  return context
}

