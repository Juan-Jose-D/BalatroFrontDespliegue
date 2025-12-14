/**
 * Servicio de Matchmaking para gestionar la cola y emparejamiento de jugadores
 */

import { webSocketService } from "./WebSocketService";
import type {
  GameMessage,
  MatchFoundDto,
  QueueStatusDto,
} from "../types/backend";
import { MessageType } from "../types/backend";
import { WS_TOPICS, WS_DESTINATIONS } from "../config/backend.config";

type MatchFoundCallback = (matchData: MatchFoundDto) => void;
type QueueStatusCallback = (status: QueueStatusDto) => void;
type ErrorCallback = (error: string) => void;

export class MatchmakingService {
  private inQueue: boolean = false;
  private currentGameId: string | null = null;
  
  // Callbacks
  private onMatchFoundCallback: MatchFoundCallback | null = null;
  private onQueueStatusCallback: QueueStatusCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;

  /**
   * Unirse a la cola de matchmaking
   */
  public joinQueue(playerId: string): void {
    if (this.inQueue) {
      console.warn("⚠️ Ya estás en la cola de matchmaking");
      return;
    }

    if (!webSocketService.isWebSocketConnected()) {
      console.error("❌ No se puede unir a la cola: no conectado al servidor");
      if (this.onErrorCallback) {
        this.onErrorCallback("No conectado al servidor");
      }
      return;
    }

    console.log("🔍 Uniéndose a la cola de matchmaking...");

    // Suscribirse al tópico de matchmaking
    webSocketService.subscribe(WS_TOPICS.MATCHMAKING, this.handleMatchmakingMessage.bind(this));

    // Enviar solicitud para unirse a la cola
    const message: GameMessage = {
      type: MessageType.JOIN_QUEUE,
      gameId: null,
      playerId: playerId,
      timestamp: new Date().toISOString(),
    };

    webSocketService.send(WS_DESTINATIONS.JOIN_QUEUE, message);
    this.inQueue = true;
  }

  /**
   * Salir de la cola de matchmaking
   */
  public leaveQueue(playerId: string): void {
    if (!this.inQueue) {
      console.warn("⚠️ No estás en la cola de matchmaking");
      return;
    }

    console.log("🚪 Saliendo de la cola de matchmaking...");

    const message: GameMessage = {
      type: MessageType.LEAVE_QUEUE,
      gameId: null,
      playerId: playerId,
      timestamp: new Date().toISOString(),
    };

    webSocketService.send(WS_DESTINATIONS.LEAVE_QUEUE, message);
    
    // Desuscribirse del tópico de matchmaking
    webSocketService.unsubscribe(WS_TOPICS.MATCHMAKING);
    
    this.inQueue = false;
  }

  /**
   * Manejar mensajes de matchmaking
   */
  private handleMatchmakingMessage(message: GameMessage): void {
    console.log("📨 Mensaje de matchmaking recibido:", message.type);

    switch (message.type) {
      case MessageType.JOIN_QUEUE:
        // Estado de la cola actualizado
        if (message.payload && this.onQueueStatusCallback) {
          const queueStatus = message.payload as QueueStatusDto;
          this.onQueueStatusCallback(queueStatus);
        }
        break;

      case MessageType.MATCH_FOUND:
        // Partida encontrada
        console.log("🎮 ¡Partida encontrada!");
        this.inQueue = false;
        
        if (message.payload && this.onMatchFoundCallback) {
          const matchData = message.payload as MatchFoundDto;
          this.currentGameId = matchData.gameId;
          this.onMatchFoundCallback(matchData);
        }
        
        // Desuscribirse del tópico de matchmaking
        webSocketService.unsubscribe(WS_TOPICS.MATCHMAKING);
        break;

      case MessageType.ERROR:
        console.error("❌ Error en matchmaking:", message.message);
        this.inQueue = false;
        
        if (this.onErrorCallback && message.message) {
          this.onErrorCallback(message.message);
        }
        break;

      default:
        console.warn("⚠️ Tipo de mensaje desconocido:", message.type);
    }
  }

  /**
   * Verificar si está en la cola
   */
  public isInQueue(): boolean {
    return this.inQueue;
  }

  /**
   * Obtener el ID de la partida actual
   */
  public getCurrentGameId(): string | null {
    return this.currentGameId;
  }

  /**
   * Limpiar el ID de la partida actual
   */
  public clearCurrentGame(): void {
    this.currentGameId = null;
  }

  /**
   * Registrar callback cuando se encuentra una partida
   */
  public onMatchFound(callback: MatchFoundCallback): void {
    this.onMatchFoundCallback = callback;
  }

  /**
   * Registrar callback para actualizaciones de estado de la cola
   */
  public onQueueStatus(callback: QueueStatusCallback): void {
    this.onQueueStatusCallback = callback;
  }

  /**
   * Registrar callback de errores
   */
  public onError(callback: ErrorCallback): void {
    this.onErrorCallback = callback;
  }
}

// Singleton
export const matchmakingService = new MatchmakingService();

