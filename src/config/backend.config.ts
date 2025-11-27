/**
 * Configuración del backend WebSocket
 * Para desarrollo local y producción
 */


interface BackendConfig {
  baseUrl: string;
  wsEndpoint: string;
  useSockJS: boolean;
}

const isDevelopment = import.meta.env.MODE === "development";


const developmentConfig: BackendConfig = {
  baseUrl: "http://localhost:8080",
  wsEndpoint: "/ws",
  useSockJS: true,
};


const productionConfig: BackendConfig = {
  baseUrl: import.meta.env.VITE_BACKEND_URL || "http://localhost:8080",
  wsEndpoint: "/ws",
  useSockJS: true,
};


export const backendConfig: BackendConfig = isDevelopment
  ? developmentConfig
  : productionConfig;


export const BACKEND_WS_URL = `${backendConfig.baseUrl}${backendConfig.wsEndpoint}`;
export const BACKEND_BASE_URL = backendConfig.baseUrl;

// Log de la URL configurada para debugging
if (import.meta.env.MODE === "development") {
  console.log("🔧 Configuración del backend:", {
    baseUrl: backendConfig.baseUrl,
    wsEndpoint: backendConfig.wsEndpoint,
    wsUrl: BACKEND_WS_URL,
    isDevelopment: isDevelopment
  });
}


export const WS_TOPICS = {
  MATCHMAKING: "/user/queue/matchmaking",
  ROOM: "/user/queue/room", 
  GAME: (gameId: string) => `/topic/game/${gameId}`,
  GAME_CHAT: (gameId: string) => `/topic/game/${gameId}/chat`,
  ERRORS: "/user/queue/errors",
  PING: "/user/queue/ping",
};

export const WS_DESTINATIONS = {
  
  JOIN_QUEUE: "/app/matchmaking/join",
  LEAVE_QUEUE: "/app/matchmaking/leave",
  
  
  CREATE_ROOM: "/app/room/create",
  JOIN_ROOM: "/app/room/join",
  LEAVE_ROOM: "/app/room/leave",
  

  GAME_MESSAGE: (gameId: string) => `/app/game/${gameId}`,
  CHAT_MESSAGE: (gameId: string) => `/app/chat/${gameId}`,
  EMOTE: (gameId: string) => `/app/game/${gameId}/emote`,
  PING: "/app/ping",
};

