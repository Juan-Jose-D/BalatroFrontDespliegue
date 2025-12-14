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
  baseUrl: "https://balatro-back-fbcpf8dzh3bkc9bf.eastus-01.azurewebsites.net",
  wsEndpoint: "/ws",
  useSockJS: true,
};


const productionConfig: BackendConfig = {
  baseUrl: import.meta.env.VITE_BACKEND_URL || "https://balatro-back-fbcpf8dzh3bkc9bf.eastus-01.azurewebsites.net",
  wsEndpoint: "/ws",
  useSockJS: true,
};


export const backendConfig: BackendConfig = isDevelopment
  ? developmentConfig
  : productionConfig;


export const BACKEND_WS_URL = `${backendConfig.baseUrl}${backendConfig.wsEndpoint}`;
export const BACKEND_BASE_URL = backendConfig.baseUrl;

// Log de la URL configurada para debugging
console.log("🔧 ========== CONFIGURACIÓN DEL BACKEND ==========");
console.log("🔧 MODE:", import.meta.env.MODE);
console.log("🔧 isDevelopment:", isDevelopment);
console.log("🔧 VITE_BACKEND_URL:", import.meta.env.VITE_BACKEND_URL);
console.log("🔧 baseUrl (final):", backendConfig.baseUrl);
console.log("🔧 wsEndpoint:", backendConfig.wsEndpoint);
console.log("🔧 BACKEND_WS_URL (final):", BACKEND_WS_URL);
console.log("🔧 BACKEND_BASE_URL (final):", BACKEND_BASE_URL);
console.log("🔧 ================================================");


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

