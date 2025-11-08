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

    console.log("🏠 Creando sala privada...");

    // Suscribirse al tópico de salas
    webSocketService.subscribe(WS_TOPICS.ROOM, this.handleRoomMessage.bind(this));

    // Generar código de sala de 6 caracteres
    const roomCode = this.generateRoomCode();
    console.log("🔑 Código generado:", roomCode);

    const createRoomDto: CreateRoomDto = {
      playerId,
      playerName,
      roomCode,
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

    console.log("📤 Enviando CREATE_ROOM:", JSON.stringify(message, null, 2));
    webSocketService.send(WS_DESTINATIONS.CREATE_ROOM, message);
    this.isHost = true;
    this.currentRoomCode = roomCode;
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

    console.log(`🚪 Uniéndose a sala con código: ${roomCode}...`);

    // Suscribirse al tópico de salas
    webSocketService.subscribe(WS_TOPICS.ROOM, this.handleRoomMessage.bind(this));

    const joinRoomDto: JoinRoomDto = {
      roomCode: roomCode.toUpperCase(),
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
    webSocketService.send(WS_DESTINATIONS.JOIN_ROOM, message);
    this.isHost = false;
    this.currentRoomCode = roomCode.toUpperCase();
    console.log("✅ Mensaje JOIN_ROOM enviado, esperando respuesta del backend...");
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
    console.log("📨 Mensaje de sala recibido:", message.type);
    console.log("📦 Payload completo:", JSON.stringify(message, null, 2));

    switch (message.type) {
      case MessageType.CREATE_ROOM:
      case MessageType.ROOM_CREATED:
        // Sala creada exitosamente - el backend envía RoomInfoDto
        if (message.payload && this.onRoomCreatedCallback) {
          const roomData = message.payload as RoomInfoDto;
          this.currentRoomCode = roomData.roomCode;
          console.log(`🏠 Sala creada con código: ${roomData.roomCode}`);
          this.onRoomCreatedCallback(roomData);
        }
        break;

      case MessageType.JOIN_ROOM:
      case MessageType.ROOM_JOINED:
        // Unión a sala exitosa (ambos jugadores reciben esto)
        if (message.payload && this.onRoomJoinedCallback) {
          const roomData = message.payload as RoomInfoDto;
          this.currentRoomCode = roomData.roomCode;
          console.log(`🎮 Sala iniciada: ${roomData.roomCode}, Game: ${roomData.gameId}`);
          this.onRoomJoinedCallback(roomData);
        }
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
    this.onRoomCreatedCallback = callback;
  }

  /**
   * Registrar callback cuando se une a una sala
   */
  public onRoomJoined(callback: RoomJoinedCallback): void {
    this.onRoomJoinedCallback = callback;
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

