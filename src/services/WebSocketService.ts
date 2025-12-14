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
  private pendingSubscriptions: Map<string, MessageCallback> = new Map();
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
   * @param playerId ID del jugador
   * @param accessToken Token JWT de Cognito (opcional)
   */
  public connect(playerId: string, accessToken?: string | null): Promise<void> {
    // Si ya hay una conexión activa con el mismo playerId, reutilizarla
    if (this.client && this.isConnected && this.playerId === playerId) {
      console.log('✅ Ya existe una conexión WebSocket activa para este jugador, reutilizando...');
      return Promise.resolve();
    }

    // Si hay una conexión activa pero con diferente playerId, cerrarla primero
    if (this.client && this.isConnected) {
      console.log('⚠️ Cerrando conexión WebSocket anterior antes de crear una nueva...');
      this.client.deactivate().catch(err => {
        console.warn('⚠️ Error al cerrar conexión anterior:', err);
      });
      this.isConnected = false;
      this.subscriptions.clear();
    }

    this.playerId = playerId;

    return new Promise((resolve, reject) => {
      try {
        // Asegurar que no haya cliente anterior
        if (this.client) {
          try {
            this.client.deactivate();
          } catch (err) {
            // Ignorar errores al desactivar cliente anterior
          }
          this.client = null;
        }

        const connectHeaders: Record<string, string> = {
          playerId: playerId,
        };

        // Agregar token JWT si está disponible
        if (accessToken) {
          connectHeaders['Authorization'] = `Bearer ${accessToken}`;
          console.log('🔐 Token de autenticación agregado al header Authorization');
          console.log('🔐 Token (primeros 20 caracteres):', accessToken.substring(0, 20) + '...');
        } else {
          console.warn('⚠️ No se proporcionó token de autenticación. El backend puede rechazar la conexión.');
        }

        this.client = new Client({
          webSocketFactory: () => new SockJS(BACKEND_WS_URL) as any,
          
          connectHeaders,

          debug: (str) => {
            console.log("[STOMP Debug]", str);
          },

          reconnectDelay: this.reconnectDelay,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,

          onConnect: async () => {
            console.log("✅ Conectado al servidor WebSocket");
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // IMPORTANTE: Esperar un momento para asegurar que el cliente STOMP esté completamente listo
            // El callback onConnect puede dispararse antes de que la conexión subyacente esté lista
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verificar que el cliente esté realmente conectado
            if (!this.client?.connected) {
              console.warn("⚠️ Cliente STOMP aún no está completamente conectado, esperando...");
              // Esperar un poco más
              await new Promise(resolve => setTimeout(resolve, 200));
              
              if (!this.client?.connected) {
                console.error("❌ Cliente STOMP no se conectó después de esperar");
                reject(new Error("Cliente STOMP no se conectó completamente"));
                return;
              }
            }
            
            console.log("✅ Cliente STOMP completamente conectado y listo");
            
            // IMPORTANTE: Registrar el playerId con el sessionId del backend
            // Esto es necesario para que el backend pueda enrutar mensajes WebRTC
            console.log("📝 Registrando sesión del jugador:", this.playerId);
            try {
              await this.registerSession();
            } catch (error) {
              console.error("❌ Error al registrar sesión en onConnect:", error);
              // No rechazar la conexión por esto, pero registrar el error
              // Intentar de nuevo después de un delay
              setTimeout(async () => {
                try {
                  await this.registerSession();
                } catch (retryError) {
                  console.error("❌ Error al reintentar registro de sesión:", retryError);
                }
              }, 500);
            }
            
            // Suscribirse a canales de usuario
            this.subscribeToUserChannels();
            
            // Procesar suscripciones pendientes
            console.log("📋 Procesando suscripciones pendientes:", this.pendingSubscriptions.size);
            this.pendingSubscriptions.forEach((callback, topic) => {
              console.log("📡 Suscribiendo a tópico pendiente:", topic);
              this.subscribe(topic, callback);
            });
            this.pendingSubscriptions.clear();
            
            if (this.onConnectCallback) {
              this.onConnectCallback();
            }
            
            resolve();
          },

          onDisconnect: () => {
            console.log("❌ Desconectado del servidor WebSocket");
            this.isConnected = false;
            this.subscriptions.clear();
            // No limpiar pendingSubscriptions para que se reintenten al reconectar
            
            if (this.onDisconnectCallback) {
              this.onDisconnectCallback();
            }
          },

          onStompError: (frame) => {
            console.error("❌ Error STOMP:", frame);
            console.error("❌ URL intentada:", BACKEND_WS_URL);
            console.error("❌ Verifica que el backend esté corriendo y accesible");
            
            const errorMessage: GameMessage = {
              type: MessageType.ERROR,
              gameId: null,
              playerId: this.playerId,
              message: frame.headers["message"] || "Error de conexión con el backend. Verifica que el servidor esté corriendo.",
              timestamp: new Date().toISOString(),
            };
            
            if (this.onErrorCallback) {
              this.onErrorCallback(errorMessage);
            }
            
            reject(new Error(frame.headers["message"] || "Error de conexión con el backend. Verifica que el servidor esté corriendo en el puerto 8080."));
          },

          onWebSocketError: (error) => {
            console.error("❌ Error WebSocket:", error);
            console.error("❌ URL intentada:", BACKEND_WS_URL);
            console.error("❌ Verifica que:");
            console.error("   1. El backend esté corriendo en el puerto 8080");
            console.error("   2. El backend tenga el endpoint /ws configurado");
            console.error("   3. No haya problemas de firewall o red");
            console.error("   4. La URL del backend sea correcta:", BACKEND_WS_URL);
            console.error("💡 Para iniciar el backend, ejecuta: mvn spring-boot:run en el directorio del backend");
            
            // No rechazar inmediatamente, permitir que el usuario vea el error
            // pero no bloquear la aplicación completamente
            const errorMessage: GameMessage = {
              type: MessageType.ERROR,
              gameId: null,
              playerId: this.playerId,
              message: "No se pudo conectar al servidor. Verifica que el backend esté corriendo en el puerto 8080.",
              timestamp: new Date().toISOString(),
            };
            
            if (this.onErrorCallback) {
              this.onErrorCallback(errorMessage);
            }
            
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
   * Registrar la sesión del jugador en el backend
   * Esto asocia el playerId con el sessionId actual del WebSocket
   * Retorna una promesa que se resuelve cuando el registro se completa
   */
  public registerSession(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client || !this.isConnected || !this.playerId) {
        const error = "No se puede registrar sesión: no conectado o sin playerId";
        console.warn("⚠️", error);
        reject(new Error(error));
        return;
      }

      // Verificar que el cliente STOMP esté realmente conectado y activo
      if (!this.client.connected) {
        const error = "Cliente STOMP no está completamente conectado";
        console.warn("⚠️", error, "Esperando...");
        // Esperar un poco y reintentar
        setTimeout(() => {
          if (this.client?.connected) {
            this.registerSession().then(resolve).catch(reject);
          } else {
            reject(new Error("Cliente STOMP no se conectó después de esperar"));
          }
        }, 200);
        return;
      }

      const registrationMessage = {
        playerId: this.playerId,
        timestamp: new Date().toISOString(),
      };

      console.log("📤 Enviando registro de sesión:", registrationMessage);
      
      try {
        // Verificar una vez más antes de publicar
        if (!this.client.connected) {
          throw new Error("Cliente STOMP se desconectó antes de publicar");
        }

        this.client.publish({
          destination: "/app/session/register",
          body: JSON.stringify(registrationMessage),
        });

        console.log("✅ Registro de sesión enviado");
        
        // Dar un pequeño delay para asegurar que el backend procese el registro
        // En producción, sería mejor tener una confirmación del backend
        setTimeout(() => {
          resolve();
        }, 100);
      } catch (error) {
        console.error("❌ Error al registrar sesión:", error);
        reject(error);
      }
    });
  }

  /**
   * Enviar mensaje al servidor
   */
  public send(destination: string, body: any): void {
    console.log("📡 ========== ENVIANDO MENSAJE AL SERVIDOR ==========");
    console.log("📡 Destination:", destination);
    console.log("📡 Has client:", !!this.client);
    console.log("📡 Is connected:", this.isConnected);
    console.log("📡 Client connected:", this.client?.connected);
    console.log("📡 Body type:", typeof body);
    
    if (destination === "/app/webrtc/signal" && body.targetId) {
      console.log("📡 Este es un mensaje WebRTC para:", body.targetId);
      console.log("📡 El backend extraerá el senderId del Principal (username de Cognito)");
      console.log("📡 El backend debe enrutar este mensaje a la sesión del jugador:", body.targetId);
      console.log("📡 El targetId debe ser un username de Cognito normalizado (trim + lowercase)");
    }
    
    if (!this.client || !this.isConnected) {
      console.error("❌ No se puede enviar mensaje: no conectado", {
        hasClient: !!this.client,
        isConnected: this.isConnected
      });
      return;
    }

    if (!this.client.connected) {
      console.error("❌ Cliente STOMP no está completamente conectado");
      return;
    }

    console.log("📤 Publicando mensaje a:", destination);
    console.log("📤 Body completo:", JSON.stringify(body, null, 2));
    
    try {
      this.client.publish({
        destination,
        body: JSON.stringify(body),
      });
      console.log("✅ Mensaje publicado exitosamente");
      console.log("✅ El backend debería procesar este mensaje ahora");
    } catch (error) {
      console.error("❌ Error al publicar mensaje:", error);
      throw error;
    }
    
    console.log("📡 =================================================");
  }

  /**
   * Suscribirse a un tópico
   * IMPORTANTE: Evita suscripciones duplicadas y limpia suscripciones anteriores del mismo tópico
   */
  public subscribe(topic: string, callback: MessageCallback): void {
    // Si no está conectado, guardar para procesar después
    if (!this.client || !this.isConnected) {
      console.warn(`⚠️ No conectado. Guardando suscripción pendiente para ${topic}`);
      this.pendingSubscriptions.set(topic, callback);
      return;
    }

    // Verificar que el cliente STOMP esté realmente conectado
    if (!this.client.connected) {
      console.warn(`⚠️ Cliente STOMP no está completamente conectado. Guardando suscripción pendiente para ${topic}`);
      this.pendingSubscriptions.set(topic, callback);
      return;
    }

    // Si ya existe una suscripción, desuscribirse primero para evitar duplicados
    if (this.subscriptions.has(topic)) {
      console.log(`🔄 Ya existe una suscripción a ${topic}, desuscribiéndose primero...`);
      const oldSubscription = this.subscriptions.get(topic);
      if (oldSubscription) {
        try {
          oldSubscription.unsubscribe();
        } catch (err) {
          console.warn(`⚠️ Error al desuscribirse de ${topic}:`, err);
        }
      }
      this.subscriptions.delete(topic);
    }

    console.log(`🔔 Suscribiéndose activamente a ${topic}...`);
    
    try {
      const subscription = this.client.subscribe(topic, (message: IMessage) => {
        try {
          console.log(`📬 ========== MENSAJE RECIBIDO EN ${topic} ==========`);
          console.log(`📬 Mensaje recibido en ${topic}:`, message.body);
          console.log(`📬 Headers del mensaje:`, message.headers);
          console.log(`📬 Destination:`, message.headers.destination || message.headers['destination']);
          
          // Para mensajes WebRTC, el body puede ser directamente el objeto envuelto
          let parsedMessage: any;
          try {
            parsedMessage = JSON.parse(message.body);
          } catch (parseError) {
            console.error("❌ Error al parsear JSON:", parseError);
            console.error("❌ Body recibido:", message.body);
            return;
          }
          
          console.log(`📋 Mensaje parseado:`, parsedMessage);
          console.log(`📋 Tipo de mensaje:`, parsedMessage.type);
          
          // Si es un mensaje WebRTC, puede venir directamente como objeto
          // o como GameMessage con type y payload
          if (parsedMessage.type === "WEBRTC_SIGNAL" || parsedMessage.type === "OFFER" || parsedMessage.type === "ANSWER" || parsedMessage.type === "ICE_CANDIDATE") {
            console.log(`📋 Este es un mensaje WebRTC de tipo: ${parsedMessage.type}`);
          } else if (parsedMessage.type) {
            console.log(`📋 Mensaje parseado tipo: ${parsedMessage.type}`);
          }
          
          console.log(`📋 Llamando callback para ${topic}...`);
          callback(parsedMessage);
          console.log(`📋 Callback ejecutado`);
          console.log(`📬 ===========================================`);
        } catch (error) {
          console.error("❌ Error al procesar mensaje:", error);
          console.error("❌ Body del mensaje:", message.body);
          console.error("❌ Error completo:", error instanceof Error ? error.stack : error);
        }
      });

      this.subscriptions.set(topic, subscription);
      console.log(`✅ Suscrito exitosamente a ${topic}`);
    } catch (error) {
      console.error(`❌ Error al suscribirse a ${topic}:`, error);
      // Guardar como pendiente para reintentar más tarde
      this.pendingSubscriptions.set(topic, callback);
    }
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

    // Verificar si ya estamos suscritos antes de suscribirnos
    if (this.subscriptions.has(WS_TOPICS.ERRORS)) {
      console.log("ℹ️ Ya suscrito a errores, omitiendo...");
    } else {
      // Suscribirse a errores
      this.subscribe(WS_TOPICS.ERRORS, (message) => {
        console.error("❌ Error del servidor:", message.message);
        if (this.onErrorCallback) {
          this.onErrorCallback(message);
        }
      });
    }

    if (this.subscriptions.has(WS_TOPICS.PING)) {
      console.log("ℹ️ Ya suscrito a ping, omitiendo...");
    } else {
      // Suscribirse a ping/pong
      this.subscribe(WS_TOPICS.PING, (message) => {
        if (message.type === MessageType.PONG) {
          console.log("🏓 Pong recibido");
        }
      });
    }
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

