/**
 * Hook personalizado para gestionar la conexión WebSocket y matchmaking
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { webSocketService } from "../services/WebSocketService";
import { matchmakingService } from "../services/MatchmakingService";
import { gameMessageService } from "../services/GameMessageService";
import type {
  GameMessage,
  MatchFoundDto,
  QueueStatusDto,
} from "../types/backend";

interface UseWebSocketOptions {
  playerId: string;
  autoConnect?: boolean;
}

export const useWebSocket = (options: UseWebSocketOptions) => {
  const { playerId, autoConnect = true } = options;
  const { getAccessToken, isAuthenticated } = useAuth();
  
  const [isConnected, setIsConnected] = useState(false);
  const [isInQueue, setIsInQueue] = useState(false);
  const [queueStatus, setQueueStatus] = useState<QueueStatusDto | null>(null);
  const [currentMatch, setCurrentMatch] = useState<MatchFoundDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gameMessages, setGameMessages] = useState<GameMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<GameMessage[]>([]);
  
  const isConnecting = useRef(false);

  /**
   * Conectar al servidor WebSocket
   */
  const connect = useCallback(async () => {
    if (isConnecting.current || isConnected) {
      return;
    }

    isConnecting.current = true;
    setError(null);

    try {
      // Obtener token JWT si el usuario está autenticado
      let accessToken: string | null = null;
      if (isAuthenticated) {
        try {
          accessToken = await getAccessToken();
          if (accessToken) {
            console.log('🔐 Token obtenido correctamente para WebSocket');
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
      setIsConnected(true);
      console.log("✅ Conectado al servidor");
    } catch (err) {
      console.error("❌ Error al conectar:", err);
      setError(err instanceof Error ? err.message : "Error de conexión");
      setIsConnected(false);
    } finally {
      isConnecting.current = false;
    }
  }, [playerId, isConnected, isAuthenticated, getAccessToken]);

  /**
   * Desconectar del servidor
   */
  const disconnect = useCallback(async () => {
    try {
      await webSocketService.disconnect();
      setIsConnected(false);
      setIsInQueue(false);
      setQueueStatus(null);
      setCurrentMatch(null);
      console.log("✅ Desconectado del servidor");
    } catch (err) {
      console.error("❌ Error al desconectar:", err);
    }
  }, []);

  /**
   * Unirse a la cola de matchmaking
   */
  const joinQueue = useCallback(() => {
    if (!isConnected) {
      setError("No estás conectado al servidor");
      return;
    }

    matchmakingService.joinQueue(playerId);
    setIsInQueue(true);
  }, [isConnected, playerId]);

  /**
   * Salir de la cola de matchmaking
   */
  const leaveQueue = useCallback(() => {
    if (!isInQueue) {
      return;
    }

    matchmakingService.leaveQueue(playerId);
    setIsInQueue(false);
    setQueueStatus(null);
  }, [isInQueue, playerId]);

  /**
   * Unirse a una partida
   */
  const joinGame = useCallback((gameId: string) => {
    gameMessageService.joinGame(gameId, playerId);
  }, [playerId]);

  /**
   * Salir de una partida
   */
  const leaveGame = useCallback(() => {
    gameMessageService.leaveGame();
    setCurrentMatch(null);
    setGameMessages([]);
    setChatMessages([]);
  }, []);

  /**
   * Enviar mensaje de juego
   */
  const sendGameMessage = useCallback((payload: any) => {
    gameMessageService.sendGameMessage(payload);
  }, []);

  /**
   * Enviar mensaje de chat
   */
  const sendChatMessage = useCallback((text: string) => {
    gameMessageService.sendChatMessage(text);
  }, []);

  /**
   * Enviar emote
   */
  const sendEmote = useCallback((emoteName: string) => {
    gameMessageService.sendEmote(emoteName);
  }, []);

  // Configurar callbacks al montar el componente
  useEffect(() => {
    // Callback de conexión
    webSocketService.onConnect(() => {
      setIsConnected(true);
      setError(null);
    });

    // Callback de desconexión
    webSocketService.onDisconnect(() => {
      setIsConnected(false);
      setIsInQueue(false);
    });

    // Callback de error
    webSocketService.onError((errorMessage) => {
      setError(errorMessage.message || "Error desconocido");
    });

    // Callback de matchmaking - partida encontrada
    matchmakingService.onMatchFound((matchData) => {
      setCurrentMatch(matchData);
      setIsInQueue(false);
      setQueueStatus(null);
      
      // Unirse automáticamente a la partida
      joinGame(matchData.gameId);
    });

    // Callback de matchmaking - estado de la cola
    matchmakingService.onQueueStatus((status) => {
      setQueueStatus(status);
    });

    // Callback de matchmaking - error
    matchmakingService.onError((errorMsg) => {
      setError(errorMsg);
      setIsInQueue(false);
    });

    // Callback de mensajes de juego
    gameMessageService.onGameMessage((message) => {
      setGameMessages((prev) => [...prev, message]);
    });

    // Callback de mensajes de chat
    gameMessageService.onChatMessage((message) => {
      setChatMessages((prev) => [...prev, message]);
    });

    // Callback de desconexión de jugador
    gameMessageService.onPlayerDisconnected((disconnectedPlayerId) => {
      console.warn("⚠️ Jugador desconectado:", disconnectedPlayerId);
      setError(`El oponente (${disconnectedPlayerId}) se ha desconectado`);
    });
  }, [joinGame]);

  // Conectar automáticamente si autoConnect está habilitado
  useEffect(() => {
    if (autoConnect && !isConnected && !isConnecting.current) {
      connect();
    }

    // Cleanup al desmontar
    return () => {
      if (isConnected) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect, isConnected]);

  return {
    // Estado
    isConnected,
    isInQueue,
    queueStatus,
    currentMatch,
    error,
    gameMessages,
    chatMessages,
    
    // Métodos
    connect,
    disconnect,
    joinQueue,
    leaveQueue,
    joinGame,
    leaveGame,
    sendGameMessage,
    sendChatMessage,
    sendEmote,
    
    // Utilidades
    clearError: () => setError(null),
    clearMessages: () => {
      setGameMessages([]);
      setChatMessages([]);
    },
  };
};

