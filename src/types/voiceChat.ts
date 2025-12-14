/**
 * Tipos para el sistema de chat de voz usando Cognito como identificador
 */

export type VoiceConnectionState = 
  | "disconnected" 
  | "connecting" 
  | "connected" 
  | "failed" 
  | "closed";

export enum SignalingMessageType {
  OFFER = "OFFER",
  ANSWER = "ANSWER",
  ICE_CANDIDATE = "ICE_CANDIDATE",
}

export interface SignalingMessage {
  type: SignalingMessageType;
  gameId: string;
  targetId: string; // Username de Cognito del destinatario normalizado (lowercase, trim)
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
  timestamp?: string; // Opcional, pero recomendado
}

// Formato del mensaje recibido del backend (envuelto)
export interface WebRTCSignalWrapper {
  type: "WEBRTC_SIGNAL";
  payload: {
    type: SignalingMessageType;
    gameId: string;
    senderId: string; // Username de Cognito del remitente (del Principal)
    targetId: string; // Username de Cognito del destinatario
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit | null;
    timestamp: string;
  };
}

