/**
 * Tipos TypeScript correspondientes a los DTOs del backend
 * Basados en el proyecto: https://github.com/Josuehmz/ARSW-Proyecto-Backend
 */

/**
 * Tipos de mensajes WebSocket
 */
export const MessageType = {
  // Matchmaking
  JOIN_QUEUE: "JOIN_QUEUE" as const,
  LEAVE_QUEUE: "LEAVE_QUEUE" as const,
  MATCH_FOUND: "MATCH_FOUND" as const,

  // Sistema de salas privadas
  CREATE_ROOM: "CREATE_ROOM" as const,
  ROOM_CREATED: "ROOM_CREATED" as const,
  JOIN_ROOM: "JOIN_ROOM" as const,
  ROOM_JOINED: "ROOM_JOINED" as const,
  LEAVE_ROOM: "LEAVE_ROOM" as const,
  ROOM_FULL: "ROOM_FULL" as const,
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND" as const,

  // Mensajes genéricos de juego
  GAME_MESSAGE: "GAME_MESSAGE" as const,

  // Eventos de juego
  ROUND_COMPLETE: "ROUND_COMPLETE" as const,
  GAME_WON: "GAME_WON" as const,
  GAME_LOST: "GAME_LOST" as const,

  // Comunicación
  CHAT_MESSAGE: "CHAT_MESSAGE" as const,
  PLAYER_EMOTE: "PLAYER_EMOTE" as const,

  // Errores
  ERROR: "ERROR" as const,

  // Eventos de conexión
  PLAYER_CONNECTED: "PLAYER_CONNECTED" as const,
  PLAYER_DISCONNECTED: "PLAYER_DISCONNECTED" as const,

  // Keep-alive
  PING: "PING" as const,
  PONG: "PONG" as const,
} as const;

export type MessageType = typeof MessageType[keyof typeof MessageType];

/**
 * Mensaje genérico para comunicación WebSocket
 */
export interface GameMessage {
  type: MessageType;
  gameId: string | null;
  playerId: string | null;
  payload?: any;
  timestamp?: string;
  message?: string;
}

/**
 * Estado simplificado del juego
 */
export interface GameState {
  gameId: string;
  player1Id: string;
  player2Id: string;
  createdAt: number;
  lastUpdate: number;
}

/**
 * DTO para notificar que se encontró una partida
 */
export interface MatchFoundDto {
  gameId: string;
  player1Id: string;
  player1Name: string;
  player2Id: string;
  player2Name: string;
  startTime: number;
}

/**
 * DTO para el estado de la cola de matchmaking
 */
export interface QueueStatusDto {
  playerId: string;
  inQueue: boolean;
  queuePosition: number | null;
  estimatedWaitTime: number | null;
  playersInQueue: number;
}

/**
 * Configuración de conexión al backend
 */
export interface BackendConfig {
  baseUrl: string;
  wsEndpoint: string;
  useSockJS: boolean;
}

/**
 * DTO para crear una sala privada
 * Coincide con CreateRoomDto.java del backend
 */
export interface CreateRoomDto {
  playerId: string;
  playerName: string;
  roomCode: string; // Código generado por el frontend
  isPrivate: boolean;
}

/**
 * DTO para unirse a una sala con código
 * Coincide con JoinRoomDto.java del backend
 */
export interface JoinRoomDto {
  roomCode: string;
  playerId: string;
  playerName: string;
}

/**
 * DTO con información completa de la sala
 * Coincide con RoomInfoDto.java del backend
 */
export interface RoomInfoDto {
  roomCode: string;
  gameId: string | null;
  hostId: string;
  hostName: string;
  guestId: string | null;
  guestName: string | null;
  isFull: boolean;
  createdAt: number;
  status: RoomStatus;
}

/**
 * Estados posibles de una sala
 */
export type RoomStatus = "WAITING" | "READY" | "IN_PROGRESS";

