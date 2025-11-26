/**
 * Tipos de mensajes de señalización WebRTC
 */
export const SignalingMessageType = {
  OFFER: "OFFER" as const,
  ANSWER: "ANSWER" as const,
  ICE_CANDIDATE: "ICE_CANDIDATE" as const,
} as const;

export type SignalingMessageType = typeof SignalingMessageType[keyof typeof SignalingMessageType];

/**
 * Mensaje de señalización WebRTC
 */
export interface SignalingMessage {
  type: SignalingMessageType;
  gameId: string;
  senderId: string;
  targetId: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
  timestamp: string;
}

/**
 * Configuración de WebRTC
 */
export interface WebRTCConfig {
  iceServers: RTCIceServer[];
}

/**
 * Estado de la conexión de voz
 */
export type VoiceConnectionState = 
  | "disconnected"
  | "connecting"
  | "connected"
  | "failed"
  | "closed";



