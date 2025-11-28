/**
 * Context API para el modo multijugador
 * Extiende GameContext y añade sincronización WebSocket
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react'
import { GameProvider, useGame } from './GameContext'
import { useAuth } from './AuthContext'
import type { GameMessage } from '../types/backend'
import { gameMessageService } from '../services/GameMessageService'
import { webSocketService } from '../services/WebSocketService'

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
  
  // Estado multijugador
  const [gameMessages, setGameMessages] = useState<GameMessage[]>([])
  const [chatMessages, setChatMessages] = useState<{ playerId: string, text: string, timestamp: number }[]>([])
  const [lastOpponentAction, setLastOpponentAction] = useState<string | null>(null)
  const [isMyTurn] = useState(true) // Por ahora, siempre es el turno del jugador (juego simultáneo)

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
      console.log('🎮 Mensaje de juego recibido en contexto:', message)
      setGameMessages(prev => [...prev, message])
      
      // Procesar acciones del oponente
      if (message.playerId !== playerId && message.payload) {
        const { action, data } = message.payload
        
        console.log('👥 Acción del oponente:', action, data)
        
        switch (action) {
          case 'PLAY_HAND':
            setOpponentScore(data.newScore || 0)
            setOpponentHands(data.handsRemaining || 0)
            setLastOpponentAction(`jugó ${data.handType}`)
            break
            
          case 'DISCARD':
            setOpponentDiscards(data.discardsRemaining || 0)
            setLastOpponentAction('descartó cartas')
            break
            
          case 'BUY_ITEM':
            setOpponentMoney(data.newMoney || 0)
            setLastOpponentAction(`compró ${data.itemName}`)
            break
            
          case 'UPDATE_STATE':
            if (data.score !== undefined) setOpponentScore(data.score)
            if (data.money !== undefined) setOpponentMoney(data.money)
            if (data.hands !== undefined) setOpponentHands(data.hands)
            if (data.discards !== undefined) setOpponentDiscards(data.discards)
            break
        }
        
        // Limpiar la notificación después de 3 segundos
        setTimeout(() => setLastOpponentAction(null), 3000)
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
        discards: game.gameState.currentRound.discardsRemaining
      })
    }
  }, [
    game.gameState.currentRound.score,
    game.gameState.currentRound.handsRemaining,
    game.gameState.money,
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
    lastOpponentAction
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
    lastOpponentAction
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

