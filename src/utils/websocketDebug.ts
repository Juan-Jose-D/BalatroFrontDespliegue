/**
 * Utilidades para depurar WebSocket y mensajes multijugador
 */

import { gameMessageService } from '../services/GameMessageService'
import { webSocketService } from '../services/WebSocketService'

/**
 * Herramienta de debug para probar mensajes
 */
export const websocketDebug = {
  /**
   * Enviar un mensaje de prueba
   */
  sendTestMessage: (gameId: string, playerId: string) => {
    const testMessage = {
      action: 'TEST',
      data: {
        message: 'Mensaje de prueba',
        timestamp: Date.now(),
        playerId
      }
    }
    
    console.log('🧪 Enviando mensaje de prueba:', testMessage)
    gameMessageService.sendGameMessage(testMessage)
  },

  /**
   * Enviar mensaje de chat de prueba
   */
  sendTestChat: (text: string) => {
    console.log('🧪 Enviando chat de prueba:', text)
    gameMessageService.sendChatMessage(text)
  },

  /**
   * Ver estado actual de conexión
   */
  getConnectionStatus: () => {
    const isConnected = webSocketService.isWebSocketConnected()
    const playerId = webSocketService.getPlayerId()
    const gameId = gameMessageService.getCurrentGameId()
    
    console.log('📊 Estado de conexión:', {
      isConnected,
      playerId,
      gameId
    })
    
    return { isConnected, playerId, gameId }
  },

  /**
   * Registrar listeners de debug
   */
  enableDebugListeners: () => {
    gameMessageService.onGameMessage((message) => {
      console.log('🔍 [DEBUG] Mensaje de juego:', message)
    })
    
    gameMessageService.onChatMessage((message) => {
      console.log('🔍 [DEBUG] Mensaje de chat:', message)
    })
    
    console.log('✅ Listeners de debug activados')
  }
}

// Exportar al objeto global para acceso desde consola del navegador
if (typeof window !== 'undefined') {
  (window as any).wsDebug = websocketDebug
}

