/**
 * Hook personalizado para gestionar salas privadas con código
 */

import { useState, useEffect, useCallback } from "react";
import { webSocketService } from "../services/WebSocketService";
import { roomService } from "../services/RoomService";
import { gameMessageService } from "../services/GameMessageService";
import type {
  GameMessage,
  RoomInfoDto,
} from "../types/backend";

interface UseRoomOptions {
  playerId: string;
  playerName?: string;
  autoConnect?: boolean;
}

export const useRoom = (options: UseRoomOptions) => {
  const { playerId, playerName = playerId, autoConnect = false } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfoDto | null>(null);
  const [isWaitingForPlayer, setIsWaitingForPlayer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameMessages, setGameMessages] = useState<GameMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<GameMessage[]>([]);

  /**
   * Conectar al servidor WebSocket
   */
  const connect = useCallback(async () => {
    if (isConnected) return;

    setError(null);
    try {
      await webSocketService.connect(playerId);
      setIsConnected(true);
      console.log("✅ Conectado al servidor");
    } catch (err) {
      console.error("❌ Error al conectar:", err);
      setError(err instanceof Error ? err.message : "Error de conexión");
      setIsConnected(false);
    }
  }, [playerId, isConnected]);

  /**
   * Desconectar del servidor
   */
  const disconnect = useCallback(async () => {
    try {
      if (roomInfo) {
        roomService.leaveRoom(playerId);
      }
      await webSocketService.disconnect();
      setIsConnected(false);
      setRoomInfo(null);
      setIsWaitingForPlayer(false);
      console.log("✅ Desconectado del servidor");
    } catch (err) {
      console.error("❌ Error al desconectar:", err);
    }
  }, [playerId, roomInfo]);

  /**
   * Crear una sala privada
   */
  const createRoom = useCallback(() => {
    if (!isConnected) {
      setError("No estás conectado al servidor");
      return;
    }

    roomService.createRoom(playerId, playerName);
    
    // Mostrar el código generado localmente inmediatamente
    const generatedCode = roomService.getCurrentRoomCode();
    if (generatedCode) {
      setRoomInfo({
        roomCode: generatedCode,
        gameId: null,
        hostId: playerId,
        hostName: playerName,
        guestId: null,
        guestName: null,
        isFull: false,
        createdAt: Date.now(),
        status: "WAITING"
      });
    }
    
    setIsWaitingForPlayer(true);
  }, [isConnected, playerId, playerName]);

  /**
   * Unirse a una sala con código
   */
  const joinRoom = useCallback((code: string) => {
    if (!isConnected) {
      setError("No estás conectado al servidor");
      return;
    }

    if (!code || code.length !== 6) {
      setError("El código debe tener 6 caracteres");
      return;
    }

    roomService.joinRoom(playerId, playerName, code);
  }, [isConnected, playerId, playerName]);

  /**
   * Salir de la sala
   */
  const leaveRoom = useCallback(() => {
    roomService.leaveRoom(playerId);
    setRoomInfo(null);
    setIsWaitingForPlayer(false);
    gameMessageService.leaveGame();
  }, [playerId]);

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
      setIsWaitingForPlayer(false);
    });

    // Callback de error de WebSocket
    webSocketService.onError((errorMessage) => {
      setError(errorMessage.message || "Error desconocido");
    });

    // Callback cuando se crea la sala
    roomService.onRoomCreated((roomData: RoomInfoDto) => {
      setRoomInfo(roomData);
      setIsWaitingForPlayer(true);
      setError(null);
      console.log(`🏠 Sala creada: ${roomData.roomCode}`);
    });

    // Callback cuando ambos jugadores están en la sala
    roomService.onRoomJoined((roomData: RoomInfoDto) => {
      setRoomInfo(roomData);
      setIsWaitingForPlayer(false);
      setError(null);
      
      // Unirse automáticamente al juego si existe gameId
      if (roomData.gameId) {
        gameMessageService.joinGame(roomData.gameId, playerId);
        console.log(`🎮 Juego iniciado en sala: ${roomData.roomCode}, Game: ${roomData.gameId}`);
      }
    });

    // Callback de error de sala
    roomService.onError((errorMsg) => {
      setError(errorMsg);
      setIsWaitingForPlayer(false);
    });

    // Callbacks de mensajes de juego
    gameMessageService.onGameMessage((message) => {
      setGameMessages((prev) => [...prev, message]);
    });

    gameMessageService.onChatMessage((message) => {
      setChatMessages((prev) => [...prev, message]);
    });

    gameMessageService.onPlayerDisconnected((disconnectedPlayerId) => {
      console.warn("⚠️ Jugador desconectado:", disconnectedPlayerId);
      setError(`El oponente se ha desconectado`);
    });
  }, [playerId]);

  // Conectar automáticamente si autoConnect está habilitado
  useEffect(() => {
    if (autoConnect && !isConnected) {
      connect();
    }
  }, [autoConnect, isConnected, connect]);

  // Cleanup al desmontar el componente
  useEffect(() => {
    return () => {
      if (webSocketService.isWebSocketConnected()) {
        webSocketService.disconnect();
      }
    };
  }, []);

  return {
    // Estado
    isConnected,
    roomCode: roomInfo?.roomCode || null,
    roomInfo,
    isWaitingForPlayer,
    currentGame: roomInfo?.gameId ? roomInfo : null,
    error,
    gameMessages,
    chatMessages,
    isHost: roomService.isRoomHost(),
    
    // Métodos
    connect,
    disconnect,
    createRoom,
    joinRoom,
    leaveRoom,
    sendGameMessage,
    sendChatMessage,
    
    // Utilidades
    clearError: () => setError(null),
    clearMessages: () => {
      setGameMessages([]);
      setChatMessages([]);
    },
  };
};

