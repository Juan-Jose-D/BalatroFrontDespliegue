/**
 * Servicio de Salas para gestionar creación y unión con código
 */

import { webSocketService } from "./WebSocketService";
import type {
  GameMessage,
  CreateRoomDto,
  RoomInfoDto,
  JoinRoomDto,
} from "../types/backend";
import { MessageType } from "../types/backend";
import { WS_TOPICS, WS_DESTINATIONS } from "../config/backend.config";

type RoomCreatedCallback = (roomData: RoomInfoDto) => void;
type RoomJoinedCallback = (roomData: RoomInfoDto) => void;
type ErrorCallback = (error: string) => void;

export class RoomService {
  private currentRoomCode: string | null = null;
  private isHost: boolean = false;
  
  // Callbacks
  private onRoomCreatedCallback: RoomCreatedCallback | null = null;
  private onRoomJoinedCallback: RoomJoinedCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;

  /**
   * Crear una sala privada
   */
  public createRoom(playerId: string, playerName: string): void {
    if (!webSocketService.isWebSocketConnected()) {
      console.error("❌ No se puede crear sala: no conectado al servidor");
      if (this.onErrorCallback) {
        this.onErrorCallback("No conectado al servidor");
      }
      return;
    }

    console.log("🏠 ========== CREANDO SALA PRIVADA ==========");
    console.log("🏠 PlayerId:", playerId);
    console.log("🏠 PlayerName:", playerName);

    // Suscribirse al tópico de salas
    console.log("🔔 Suscribiéndose a:", WS_TOPICS.ROOM);
    webSocketService.subscribe(WS_TOPICS.ROOM, this.handleRoomMessage.bind(this));
    console.log("✅ Suscrito a tópico de salas");

    // Generar código de sala de 6 caracteres y normalizarlo a mayúsculas
    const roomCode = this.generateRoomCode().toUpperCase();
    console.log("🔑 Código generado:", roomCode);
    console.log("🔑 Código normalizado (mayúsculas):", roomCode);

    const createRoomDto: CreateRoomDto = {
      playerId,
      playerName,
      roomCode, // Ya está en mayúsculas
      isPrivate: true,
    };

    // Enviar solicitud para crear sala
    const message: GameMessage = {
      type: MessageType.CREATE_ROOM,
      gameId: null,
      playerId: playerId,
      payload: createRoomDto,
      timestamp: new Date().toISOString(),
    };

    console.log("📤 Enviando CREATE_ROOM a:", WS_DESTINATIONS.CREATE_ROOM);
    console.log("📤 Mensaje completo:", JSON.stringify(message, null, 2));
    webSocketService.send(WS_DESTINATIONS.CREATE_ROOM, message);
    this.isHost = true;
    this.currentRoomCode = roomCode;
    console.log("✅ Mensaje CREATE_ROOM enviado, esperando respuesta del backend...");
    console.log("🏠 ==========================================");
  }

  /**
   * Unirse a una sala con código
   */
  public joinRoom(playerId: string, playerName: string, roomCode: string): void {
    if (!webSocketService.isWebSocketConnected()) {
      console.error("❌ No se puede unir a sala: no conectado al servidor");
      if (this.onErrorCallback) {
        this.onErrorCallback("No conectado al servidor");
      }
      return;
    }

    // Normalizar el código a mayúsculas para consistencia con el backend
    const normalizedRoomCode = roomCode.trim().toUpperCase();
    console.log(`🚪 Uniéndose a sala con código: ${roomCode}...`);
    console.log(`🔑 Código original: "${roomCode}"`);
    console.log(`🔑 Código normalizado (mayúsculas): "${normalizedRoomCode}"`);

    // Suscribirse al tópico de salas
    webSocketService.subscribe(WS_TOPICS.ROOM, this.handleRoomMessage.bind(this));

    const joinRoomDto: JoinRoomDto = {
      roomCode: normalizedRoomCode,
      playerId,
      playerName,
    };

    // Enviar solicitud para unirse a sala
    const message: GameMessage = {
      type: MessageType.JOIN_ROOM,
      gameId: null,
      playerId: playerId,
      payload: joinRoomDto,
      timestamp: new Date().toISOString(),
    };

    console.log("📤 Enviando JOIN_ROOM:", JSON.stringify(message, null, 2));
    console.log("📤 Código de sala en el mensaje:", normalizedRoomCode);
    webSocketService.send(WS_DESTINATIONS.JOIN_ROOM, message);
    this.isHost = false;
    this.currentRoomCode = normalizedRoomCode;
    console.log("✅ Mensaje JOIN_ROOM enviado, esperando respuesta del backend...");
    console.log("✅ Código de sala almacenado:", this.currentRoomCode);
  }

  /**
   * Salir de una sala
   */
  public leaveRoom(playerId: string): void {
    if (!this.currentRoomCode) {
      console.warn("⚠️ No estás en ninguna sala");
      return;
    }

    console.log("🚪 Saliendo de la sala...");

    const message: GameMessage = {
      type: MessageType.LEAVE_ROOM,
      gameId: null,
      playerId: playerId,
      payload: { roomCode: this.currentRoomCode },
      timestamp: new Date().toISOString(),
    };

    webSocketService.send(WS_DESTINATIONS.LEAVE_ROOM, message);
    
    // Desuscribirse del tópico de salas
    webSocketService.unsubscribe(WS_TOPICS.ROOM);
    
    this.currentRoomCode = null;
    this.isHost = false;
  }

  /**
   * Manejar mensajes de sala
   */
  private handleRoomMessage(message: GameMessage): void {
    console.log("📨 ========== MENSAJE DE SALA RECIBIDO ==========");
    console.log("📨 Tipo:", message.type);
    console.log("📨 Payload completo:", JSON.stringify(message, null, 2));
    console.log("📨 Tiene payload:", !!message.payload);
    console.log("📨 Tiene callback:", !!this.onRoomCreatedCallback);

    switch (message.type) {
      case MessageType.CREATE_ROOM:
      case MessageType.ROOM_CREATED:
        // Sala creada exitosamente - el backend envía RoomInfoDto
        console.log("🏠 Procesando respuesta de creación de sala...");
        if (message.payload) {
          try {
            const roomData = message.payload as RoomInfoDto;
            console.log("🏠 Datos de sala recibidos:", roomData);
            this.currentRoomCode = roomData.roomCode;
            console.log(`🏠 Sala creada con código: ${roomData.roomCode}`);
            
            if (this.onRoomCreatedCallback) {
              console.log("🏠 Llamando callback onRoomCreated...");
              this.onRoomCreatedCallback(roomData);
              console.log("✅ Callback ejecutado");
            } else {
              console.warn("⚠️ No hay callback registrado para onRoomCreated");
            }
          } catch (error) {
            console.error("❌ Error al procesar datos de sala:", error);
            if (this.onErrorCallback) {
              this.onErrorCallback(`Error al procesar respuesta de sala: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            }
          }
        } else {
          console.warn("⚠️ Mensaje CREATE_ROOM/ROOM_CREATED sin payload");
        }
        console.log("📨 ==========================================");
        break;

      case MessageType.JOIN_ROOM:
      case MessageType.ROOM_JOINED:
        // Unión a sala exitosa (ambos jugadores reciben esto)
        console.log("🎮 ========== PROCESANDO RESPUESTA DE UNIÓN A SALA ==========");
        console.log("🎮 Procesando respuesta de unión a sala...");
        console.log("🎮 Tiene payload:", !!message.payload);
        console.log("🎮 Tiene callback:", !!this.onRoomJoinedCallback);
        
        if (message.payload) {
          try {
            const roomData = message.payload as RoomInfoDto;
            console.log("🎮 Datos de sala recibidos:", roomData);
            this.currentRoomCode = roomData.roomCode;
            console.log(`🎮 Sala iniciada: ${roomData.roomCode}, Game: ${roomData.gameId}`);
            
            if (this.onRoomJoinedCallback) {
              console.log("🎮 Llamando callback onRoomJoined...");
              try {
                this.onRoomJoinedCallback(roomData);
                console.log("✅ Callback ejecutado exitosamente");
              } catch (callbackError) {
                console.error("❌ Error al ejecutar callback onRoomJoined:", callbackError);
                console.error("❌ Stack trace:", callbackError instanceof Error ? callbackError.stack : 'N/A');
                if (this.onErrorCallback) {
                  this.onErrorCallback(`Error al ejecutar callback: ${callbackError instanceof Error ? callbackError.message : 'Error desconocido'}`);
                }
              }
            } else {
              console.error("❌ ========== ERROR CRÍTICO ==========");
              console.error("❌ No hay callback registrado para onRoomJoined");
              console.error("❌ Esto significa que el callback no se registró antes de recibir el mensaje");
              console.error("❌ Verifica que el useEffect que registra los callbacks se ejecute antes de joinRoom");
              console.error("❌ Estado actual de callbacks:");
              console.error("❌   - onRoomCreatedCallback:", !!this.onRoomCreatedCallback);
              console.error("❌   - onRoomJoinedCallback:", !!this.onRoomJoinedCallback);
              console.error("❌   - onErrorCallback:", !!this.onErrorCallback);
              console.error("❌ ==========================================");
              
              // Intentar usar el callback de error para notificar al usuario
              if (this.onErrorCallback) {
                this.onErrorCallback("Error: callback no registrado. Intenta unirte de nuevo.");
              }
            }
          } catch (error) {
            console.error("❌ Error al procesar datos de sala:", error);
            if (this.onErrorCallback) {
              this.onErrorCallback(`Error al procesar respuesta de sala: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            }
          }
        } else {
          console.warn("⚠️ Mensaje JOIN_ROOM/ROOM_JOINED sin payload");
          console.warn("⚠️ Mensaje completo:", JSON.stringify(message, null, 2));
        }
        console.log("🎮 ==========================================");
        break;

      case MessageType.ROOM_FULL:
        console.error("❌ La sala está llena");
        if (this.onErrorCallback) {
          this.onErrorCallback("La sala está llena");
        }
        this.currentRoomCode = null;
        this.isHost = false;
        break;

      case MessageType.ROOM_NOT_FOUND:
        console.error("❌ Sala no encontrada");
        if (this.onErrorCallback) {
          this.onErrorCallback("Sala no encontrada. Verifica el código.");
        }
        this.currentRoomCode = null;
        this.isHost = false;
        break;

      case MessageType.ERROR:
        console.error("❌ Error en sala:", message.message);
        
        if (this.onErrorCallback && message.message) {
          this.onErrorCallback(message.message);
        }
        
        // Limpiar estado en caso de error
        this.currentRoomCode = null;
        this.isHost = false;
        break;

      default:
        console.warn("⚠️ Tipo de mensaje de sala desconocido:", message.type);
    }
  }

  /**
   * Generar código de sala aleatorio de 6 caracteres
   */
  private generateRoomCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Sin O, I, 0, 1 para evitar confusión
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  /**
   * Verificar si es el host de la sala
   */
  public isRoomHost(): boolean {
    return this.isHost;
  }

  /**
   * Obtener el código de sala actual
   */
  public getCurrentRoomCode(): string | null {
    return this.currentRoomCode;
  }

  /**
   * Registrar callback cuando se crea una sala
   */
  public onRoomCreated(callback: RoomCreatedCallback): void {
    console.log("🔧 ========== REGISTRANDO CALLBACK onRoomCreated ==========");
    console.log("🔧 Callback anterior:", !!this.onRoomCreatedCallback);
    this.onRoomCreatedCallback = callback;
    console.log("🔧 Callback nuevo:", !!this.onRoomCreatedCallback);
    console.log("✅ Callback onRoomCreated registrado exitosamente");
    console.log("🔧 ==========================================");
  }

  /**
   * Registrar callback cuando se une a una sala
   */
  public onRoomJoined(callback: RoomJoinedCallback): void {
    console.log("🔧 ========== REGISTRANDO CALLBACK onRoomJoined ==========");
    console.log("🔧 Callback anterior:", !!this.onRoomJoinedCallback);
    this.onRoomJoinedCallback = callback;
    console.log("🔧 Callback nuevo:", !!this.onRoomJoinedCallback);
    console.log("✅ Callback onRoomJoined registrado exitosamente");
    console.log("🔧 ==========================================");
  }

  /**
   * Registrar callback de errores
   */
  public onError(callback: ErrorCallback): void {
    this.onErrorCallback = callback;
  }
}

// Singleton
export const roomService = new RoomService();

