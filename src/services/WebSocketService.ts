/**
 * Servicio de WebSocket para comunicación en tiempo real con el backend
 * Utiliza STOMP sobre WebSocket/SockJS
 */

import { Client } from "@stomp/stompjs";
import type { IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import type { GameMessage } from "../types/backend";
import { MessageType } from "../types/backend";
import { BACKEND_WS_URL, WS_TOPICS, WS_DESTINATIONS } from "../config/backend.config";

type MessageCallback = (message: GameMessage) => void;
type ErrorCallback = (error: GameMessage) => void;
type ConnectionCallback = () => void;

export class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private messageHandlers: Map<string, MessageCallback[]> = new Map();
  private playerId: string | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 3000;

  // Callbacks
  private onConnectCallback: ConnectionCallback | null = null;
  private onDisconnectCallback: ConnectionCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;

  /**
   * Inicializar la conexión WebSocket
   */
  public connect(playerId: string): Promise<void> {
    this.playerId = playerId;

    return new Promise((resolve, reject) => {
      try {
        this.client = new Client({
          webSocketFactory: () => new SockJS(BACKEND_WS_URL) as any,
          
          connectHeaders: {
            playerId: playerId,
          },

          debug: (str) => {
            console.log("[STOMP Debug]", str);
          },

          reconnectDelay: this.reconnectDelay,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,

          onConnect: () => {
            console.log("✅ Conectado al servidor WebSocket");
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Suscribirse a canales de usuario
            this.subscribeToUserChannels();
            
            if (this.onConnectCallback) {
              this.onConnectCallback();
            }
            
            resolve();
          },

          onDisconnect: () => {
            console.log("❌ Desconectado del servidor WebSocket");
            this.isConnected = false;
            this.subscriptions.clear();
            
            if (this.onDisconnectCallback) {
              this.onDisconnectCallback();
            }
          },

          onStompError: (frame) => {
            console.error("❌ Error STOMP:", frame);
            
            const errorMessage: GameMessage = {
              type: MessageType.ERROR,
              gameId: null,
              playerId: this.playerId,
              message: frame.headers["message"] || "Error de conexión",
              timestamp: new Date().toISOString(),
            };
            
            if (this.onErrorCallback) {
              this.onErrorCallback(errorMessage);
            }
            
            reject(new Error(frame.headers["message"] || "Error de conexión"));
          },

          onWebSocketError: (error) => {
            console.error("❌ Error WebSocket:", error);
            reject(error);
          },
        });

        this.client.activate();
      } catch (error) {
        console.error("❌ Error al inicializar WebSocket:", error);
        reject(error);
      }
    });
  }

  /**
   * Desconectar del servidor
   */
  public async disconnect(): Promise<void> {
    if (this.client && this.isConnected) {
      console.log("🔌 Desconectando del servidor...");
      
      // Desuscribirse de todos los canales
      this.subscriptions.forEach((subscription) => {
        subscription.unsubscribe();
      });
      this.subscriptions.clear();
      this.messageHandlers.clear();
      
      await this.client.deactivate();
      this.isConnected = false;
    }
  }

  /**
   * Verificar si está conectado
   */
  public isWebSocketConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Enviar mensaje al servidor
   */
  public send(destination: string, body: any): void {
    if (!this.client || !this.isConnected) {
      console.error("❌ No se puede enviar mensaje: no conectado");
      return;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
  }

  /**
   * Suscribirse a un tópico
   */
  public subscribe(topic: string, callback: MessageCallback): void {
    if (!this.client || !this.isConnected) {
      console.warn("⚠️ No conectado. La suscripción se realizará al conectar.");
      return;
    }

    // Evitar suscripciones duplicadas
    if (this.subscriptions.has(topic)) {
      console.warn(`⚠️ Ya existe una suscripción a ${topic}`);
      return;
    }

    const subscription = this.client.subscribe(topic, (message: IMessage) => {
      try {
        console.log(`📬 Mensaje recibido en ${topic}:`, message.body);
        const parsedMessage: GameMessage = JSON.parse(message.body);
        console.log(`📋 Mensaje parseado tipo: ${parsedMessage.type}`);
        callback(parsedMessage);
      } catch (error) {
        console.error("❌ Error al parsear mensaje:", error, message.body);
      }
    });

    this.subscriptions.set(topic, subscription);
    console.log(`✅ Suscrito a ${topic}`);
  }

  /**
   * Desuscribirse de un tópico
   */
  public unsubscribe(topic: string): void {
    const subscription = this.subscriptions.get(topic);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(topic);
      console.log(`✅ Desuscrito de ${topic}`);
    }
  }

  /**
   * Suscribirse a canales de usuario (errores, matchmaking, ping)
   */
  private subscribeToUserChannels(): void {
    if (!this.playerId) return;

    // Suscribirse a errores
    this.subscribe(WS_TOPICS.ERRORS, (message) => {
      console.error("❌ Error del servidor:", message.message);
      if (this.onErrorCallback) {
        this.onErrorCallback(message);
      }
    });

    // Suscribirse a ping/pong
    this.subscribe(WS_TOPICS.PING, (message) => {
      if (message.type === MessageType.PONG) {
        console.log("🏓 Pong recibido");
      }
    });
  }

  /**
   * Registrar callback de conexión
   */
  public onConnect(callback: ConnectionCallback): void {
    this.onConnectCallback = callback;
  }

  /**
   * Registrar callback de desconexión
   */
  public onDisconnect(callback: ConnectionCallback): void {
    this.onDisconnectCallback = callback;
  }

  /**
   * Registrar callback de errores
   */
  public onError(callback: ErrorCallback): void {
    this.onErrorCallback = callback;
  }

  /**
   * Obtener el playerId actual
   */
  public getPlayerId(): string | null {
    return this.playerId;
  }
}

// Singleton
export const webSocketService = new WebSocketService();

