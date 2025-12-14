/**
 * Servicio para gestionar mensajes de juego en tiempo real
 * Maneja la comunicación entre jugadores durante una partida
 */

import { webSocketService } from "./WebSocketService";
import type { GameMessage } from "../types/backend";
import { MessageType } from "../types/backend";
import { WS_TOPICS, WS_DESTINATIONS } from "../config/backend.config";

type GameMessageCallback = (message: GameMessage) => void;
type PlayerDisconnectedCallback = (playerId: string) => void;

export class GameMessageService {
  private currentGameId: string | null = null;
  private playerId: string | null = null;
  
  // Callbacks
  private onGameMessageCallback: GameMessageCallback | null = null;
  private onChatMessageCallback: GameMessageCallback | null = null;
  private onPlayerDisconnectedCallback: PlayerDisconnectedCallback | null = null;

  /**
   * Conectarse a una partida (suscribirse a los tópicos del juego)
   */
  public joinGame(gameId: string, playerId: string): void {
    console.log(`🎮 Uniéndose a la partida: ${gameId}`);
    
    this.currentGameId = gameId;
    this.playerId = playerId;

    // Suscribirse al tópico principal del juego
    webSocketService.subscribe(
      WS_TOPICS.GAME(gameId),
      this.handleGameMessage.bind(this)
    );

    // Suscribirse al tópico de chat
    webSocketService.subscribe(
      WS_TOPICS.GAME_CHAT(gameId),
      this.handleChatMessage.bind(this)
    );

    console.log(`✅ Conectado a la partida: ${gameId}`);
  }

  /**
   * Salir de una partida (desuscribirse de los tópicos del juego)
   */
  public leaveGame(): void {
    if (!this.currentGameId) {
      console.warn("⚠️ No hay partida activa para salir");
      return;
    }

    console.log(`🚪 Saliendo de la partida: ${this.currentGameId}`);

    // Desuscribirse de los tópicos del juego
    webSocketService.unsubscribe(WS_TOPICS.GAME(this.currentGameId));
    webSocketService.unsubscribe(WS_TOPICS.GAME_CHAT(this.currentGameId));

    this.currentGameId = null;
    this.playerId = null;
  }

  /**
   * Enviar un mensaje de juego genérico
   */
  public sendGameMessage(payload: any, messageType: MessageType = MessageType.GAME_MESSAGE): void {
    if (!this.currentGameId || !this.playerId) {
      console.error("❌ No se puede enviar mensaje: no hay partida activa");
      return;
    }

    const message: GameMessage = {
      type: messageType,
      gameId: this.currentGameId,
      playerId: this.playerId,
      payload: payload,
      timestamp: new Date().toISOString(),
    };

    const destination = WS_DESTINATIONS.GAME_MESSAGE(this.currentGameId);
    console.log(`📤 Enviando mensaje de juego a: ${destination}`, message);

    webSocketService.send(destination, message);
  }

  /**
   * Enviar un mensaje de chat
   */
  public sendChatMessage(text: string): void {
    if (!this.currentGameId || !this.playerId) {
      console.error("❌ No se puede enviar mensaje de chat: no hay partida activa");
      return;
    }

    const message: GameMessage = {
      type: MessageType.CHAT_MESSAGE,
      gameId: this.currentGameId,
      playerId: this.playerId,
      message: text,
      timestamp: new Date().toISOString(),
    };

    const destination = WS_DESTINATIONS.CHAT_MESSAGE(this.currentGameId);
    console.log(`📤 Enviando mensaje de chat a: ${destination}`, message);

    webSocketService.send(destination, message);
  }

  /**
   * Enviar un emote
   */
  public sendEmote(emoteName: string): void {
    if (!this.currentGameId || !this.playerId) {
      console.error("❌ No se puede enviar emote: no hay partida activa");
      return;
    }

    const message: GameMessage = {
      type: MessageType.PLAYER_EMOTE,
      gameId: this.currentGameId,
      playerId: this.playerId,
      payload: { emote: emoteName },
      timestamp: new Date().toISOString(),
    };

    webSocketService.send(
      WS_DESTINATIONS.EMOTE(this.currentGameId),
      message
    );
  }

  /**
   * Enviar ping para keep-alive
   */
  public sendPing(): void {
    const message: GameMessage = {
      type: MessageType.PING,
      gameId: this.currentGameId,
      playerId: this.playerId,
      timestamp: new Date().toISOString(),
    };

    webSocketService.send(WS_DESTINATIONS.PING, message);
  }

  /**
   * Manejar mensajes del juego
   */
  private handleGameMessage(message: GameMessage): void {
    console.log("📨 Mensaje de juego recibido:", message.type);

    switch (message.type) {
      case MessageType.GAME_MESSAGE:
        if (this.onGameMessageCallback) {
          this.onGameMessageCallback(message);
        }
        break;

      case MessageType.ROUND_COMPLETE:
      case MessageType.GAME_WON:
      case MessageType.GAME_LOST:
        // Estos eventos también se pasan al callback de mensajes de juego
        if (this.onGameMessageCallback) {
          this.onGameMessageCallback(message);
        }
        break;

      case MessageType.PLAYER_DISCONNECTED:
        console.warn("⚠️ Jugador desconectado:", message.playerId);
        if (this.onPlayerDisconnectedCallback && message.playerId) {
          this.onPlayerDisconnectedCallback(message.playerId);
        }
        break;

      case MessageType.PLAYER_CONNECTED:
        console.log("✅ Jugador conectado:", message.playerId);
        break;

      case MessageType.PLAYER_EMOTE:
        if (this.onGameMessageCallback) {
          this.onGameMessageCallback(message);
        }
        break;

      default:
        console.warn("⚠️ Tipo de mensaje de juego desconocido:", message.type);
        if (this.onGameMessageCallback) {
          this.onGameMessageCallback(message);
        }
    }
  }

  /**
   * Manejar mensajes de chat
   */
  private handleChatMessage(message: GameMessage): void {
    console.log("💬 Mensaje de chat recibido de:", message.playerId);
    
    if (this.onChatMessageCallback) {
      this.onChatMessageCallback(message);
    }
  }

  /**
   * Registrar callback para mensajes de juego
   */
  public onGameMessage(callback: GameMessageCallback): void {
    this.onGameMessageCallback = callback;
  }

  /**
   * Registrar callback para mensajes de chat
   */
  public onChatMessage(callback: GameMessageCallback): void {
    this.onChatMessageCallback = callback;
  }

  /**
   * Registrar callback para desconexión de jugador
   */
  public onPlayerDisconnected(callback: PlayerDisconnectedCallback): void {
    this.onPlayerDisconnectedCallback = callback;
  }

  /**
   * Obtener el ID de la partida actual
   */
  public getCurrentGameId(): string | null {
    return this.currentGameId;
  }

  /**
   * Obtener el ID del jugador actual
   */
  public getPlayerId(): string | null {
    return this.playerId;
  }
}

// Singleton
export const gameMessageService = new GameMessageService();

