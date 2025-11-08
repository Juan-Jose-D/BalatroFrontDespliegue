/**
 * Configuración del backend WebSocket
 * Para desarrollo local y producción
 */

// Interface de configuración (definida aquí para evitar problemas de importación circular)
interface BackendConfig {
  baseUrl: string;
  wsEndpoint: string;
  useSockJS: boolean;
}

const isDevelopment = import.meta.env.MODE === "development";

// Configuración para desarrollo
const developmentConfig: BackendConfig = {
  baseUrl: "http://localhost:8080",
  wsEndpoint: "/ws",
  useSockJS: true,
};

// Configuración para producción
const productionConfig: BackendConfig = {
  baseUrl: import.meta.env.VITE_BACKEND_URL || "http://localhost:8080",
  wsEndpoint: "/ws",
  useSockJS: true,
};

// Exportar configuración según el entorno
export const backendConfig: BackendConfig = isDevelopment
  ? developmentConfig
  : productionConfig;

// URLs completas
export const BACKEND_WS_URL = `${backendConfig.baseUrl}${backendConfig.wsEndpoint}`;
export const BACKEND_BASE_URL = backendConfig.baseUrl;

// Tópicos y destinos WebSocket
export const WS_TOPICS = {
  MATCHMAKING: "/user/queue/matchmaking",
  ROOM: "/user/queue/room", // Para respuestas de sala
  GAME: (gameId: string) => `/topic/game/${gameId}`,
  GAME_CHAT: (gameId: string) => `/topic/game/${gameId}/chat`,
  ERRORS: "/user/queue/errors",
  PING: "/user/queue/ping",
};

export const WS_DESTINATIONS = {
  // Matchmaking automático
  JOIN_QUEUE: "/app/matchmaking/join",
  LEAVE_QUEUE: "/app/matchmaking/leave",
  
  // Sistema de salas con código
  CREATE_ROOM: "/app/room/create",
  JOIN_ROOM: "/app/room/join",
  LEAVE_ROOM: "/app/room/leave",
  
  // Juego
  GAME_MESSAGE: (gameId: string) => `/app/game/${gameId}/message`,
  CHAT_MESSAGE: (gameId: string) => `/app/game/${gameId}/chat`,
  EMOTE: (gameId: string) => `/app/game/${gameId}/emote`,
  PING: "/app/ping",
};

