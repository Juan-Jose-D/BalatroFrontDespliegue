/**
 * Hook personalizado para gestionar salas privadas con código
 */

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
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
  const { getAccessToken, isAuthenticated } = useAuth();
  
  // Usar refs para mantener valores actualizados en callbacks
  const playerIdRef = useRef(playerId);
  const playerNameRef = useRef(playerName);
  
  // Actualizar refs cuando cambien los valores
  useEffect(() => {
    playerIdRef.current = playerId;
    playerNameRef.current = playerName;
  }, [playerId, playerName]);
  
  const [isConnected, setIsConnected] = useState(false);
  const [roomInfo, setRoomInfo] = useState<RoomInfoDto | null>(null);
  const [isWaitingForPlayer, setIsWaitingForPlayer] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gameMessages, setGameMessages] = useState<GameMessage[]>([]);
  const [chatMessages, setChatMessages] = useState<GameMessage[]>([]);

  /**
   * Conectar al servidor WebSocket con autenticación
   */
  const connect = useCallback(async () => {
    if (isConnected) return;

    setError(null);
    try {
      // Obtener token JWT si el usuario está autenticado
      let accessToken: string | null = null;
      if (isAuthenticated) {
        try {
          accessToken = await getAccessToken();
          if (accessToken) {
            console.log('🔐 Token obtenido correctamente para WebSocket en useRoom');
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
    }
  }, [playerId, isConnected, isAuthenticated, getAccessToken]);

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

  // Configurar callbacks al montar el componente - SIN dependencias para que se ejecute solo una vez
  // IMPORTANTE: Este useEffect debe ejecutarse ANTES de cualquier llamada a joinRoom o createRoom
  useEffect(() => {
    console.log("🔧 ========== REGISTRANDO CALLBACKS DE ROOMSERVICE ==========");
    console.log("🔧 PlayerId actual:", playerId);
    console.log("🔧 PlayerName actual:", playerName);
    console.log("🔧 Timestamp:", new Date().toISOString());
    
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
    const roomCreatedHandler = (roomData: RoomInfoDto) => {
      console.log("🏠 ========== CALLBACK: SALA CREADA ==========");
      console.log("🏠 Datos recibidos:", roomData);
      setRoomInfo(roomData);
      setIsWaitingForPlayer(true);
      setError(null);
      console.log(`🏠 Sala creada exitosamente: ${roomData.roomCode}`);
      console.log("🏠 ==========================================");
    };
    roomService.onRoomCreated(roomCreatedHandler);
    console.log("✅ Callback onRoomCreated registrado");

    // Callback cuando ambos jugadores están en la sala
    // IMPORTANTE: Usar refs para obtener el playerId actualizado
    const roomJoinedHandler = (roomData: RoomInfoDto) => {
      console.log("🎮 ========== CALLBACK: SALA UNIDA ==========");
      console.log("🎮 Datos recibidos:", roomData);
      console.log("🎮 RoomCode:", roomData.roomCode);
      console.log("🎮 GameId:", roomData.gameId);
      console.log("🎮 HostId:", roomData.hostId);
      console.log("🎮 GuestId:", roomData.guestId);
      
      // Obtener el playerId actualizado de la ref
      const currentPlayerId = playerIdRef.current;
      console.log("🎮 PlayerId actual del hook (desde ref):", currentPlayerId);
      
      setRoomInfo(roomData);
      setIsWaitingForPlayer(false);
      setError(null);
      
      // Unirse automáticamente al juego si existe gameId
      if (roomData.gameId) {
        console.log(`🎮 Uniéndose al juego: ${roomData.gameId}`);
        if (currentPlayerId && currentPlayerId !== 'loading') {
          gameMessageService.joinGame(roomData.gameId, currentPlayerId);
          console.log(`🎮 Juego iniciado en sala: ${roomData.roomCode}, Game: ${roomData.gameId}`);
        } else {
          console.warn("⚠️ PlayerId no disponible o aún está cargando:", currentPlayerId);
        }
      } else {
        console.warn("⚠️ La sala no tiene gameId aún, esperando...");
      }
      console.log("🎮 ==========================================");
    };
    roomService.onRoomJoined(roomJoinedHandler);
    console.log("✅ Callback onRoomJoined registrado");
    
    // Verificar que el callback esté realmente registrado
    // Nota: No podemos acceder directamente a la propiedad privada, pero el método onRoomJoined
    // debería haberlo registrado. Si hay un problema, se verá en los logs cuando llegue el mensaje.

    // Callback de error de sala
    const errorHandler = (errorMsg: string) => {
      console.error("❌ Error de sala:", errorMsg);
      setError(errorMsg);
      setIsWaitingForPlayer(false);
    };
    roomService.onError(errorHandler);
    console.log("✅ Callback onError registrado");
    console.log("🔧 Todos los callbacks registrados correctamente");
    console.log("🔧 ==========================================");

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

    // Cleanup: no desregistrar callbacks aquí porque son necesarios mientras el hook esté activo
    // Los callbacks se mantienen registrados hasta que el componente se desmonte
    return () => {
      console.log("🧹 Limpiando callbacks de RoomService...");
      // No desregistramos los callbacks aquí porque RoomService es un singleton
      // y otros componentes podrían estar usando los mismos callbacks
    };
  }, []); // Sin dependencias - se ejecuta solo una vez al montar

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

