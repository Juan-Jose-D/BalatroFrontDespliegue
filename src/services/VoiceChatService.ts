import { webSocketService } from "./WebSocketService";
import type { SignalingMessage, VoiceConnectionState } from "../types/webrtc";
import { SignalingMessageType } from "../types/webrtc";

type ConnectionStateCallback = (state: VoiceConnectionState) => void;
type RemoteStreamCallback = (stream: MediaStream) => void;
type ErrorCallback = (error: string) => void;

export class VoiceChatService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  
  private gameId: string | null = null;
  private localPlayerId: string | null = null;
  private remotePlayerId: string | null = null;
  
  private isMuted: boolean = false;
  private isInitiator: boolean = false;
  
  // Callbacks
  private onConnectionStateChangeCallback: ConnectionStateCallback | null = null;
  private onRemoteStreamCallback: RemoteStreamCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;
  
  // Configuración de ICE servers (STUN servers públicos de Google)
  private iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  /**
   * Inicializar el chat de voz
   */
  public async initialize(
    gameId: string,
    localPlayerId: string,
    remotePlayerId: string,
    isInitiator: boolean = false
  ): Promise<void> {
    console.log("🎤 Inicializando chat de voz...", { gameId, localPlayerId, remotePlayerId, isInitiator });
    
    this.gameId = gameId;
    this.localPlayerId = localPlayerId;
    this.remotePlayerId = remotePlayerId;
    this.isInitiator = isInitiator;

    try {
      // Obtener acceso al micrófono
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });

      console.log("✅ Acceso al micrófono obtenido");
      console.log("🎤 Tracks locales:", this.localStream.getTracks().length);
      this.localStream.getTracks().forEach((track) => {
        console.log(`🎤 Track local: ${track.kind} - Enabled: ${track.enabled}`);
      });

      // Crear peer connection
      this.createPeerConnection();

      // Agregar el stream local a la conexión
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          const sender = this.peerConnection.addTrack(track, this.localStream);
          console.log("✅ Track agregado al peer connection:", track.kind, sender);
        }
      });

      // Suscribirse a mensajes de señalización
      webSocketService.subscribe(
        `/user/queue/webrtc/${gameId}`,
        this.handleSignalingMessage.bind(this)
      );

      // Si es el iniciador, crear y enviar offer
      if (this.isInitiator) {
        await this.createOffer();
      }

      this.updateConnectionState("connecting");
    } catch (error) {
      console.error("❌ Error al inicializar chat de voz:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback("No se pudo acceder al micrófono. Verifica los permisos.");
      }
      this.updateConnectionState("failed");
      throw error;
    }
  }

  /**
   * Crear peer connection
   */
  private createPeerConnection(): void {
    console.log("🔗 Creando peer connection...");

    this.peerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
    });

    // Manejar ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log("🧊 ICE candidate generado");
        this.sendSignalingMessage(SignalingMessageType.ICE_CANDIDATE, event.candidate);
      }
    };

    // Manejar cambios de estado de la conexión
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      console.log("🔄 Estado de conexión:", state);
      
      if (state) {
        this.updateConnectionState(state as VoiceConnectionState);
      }
    };

    // Log del estado ICE
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      console.log("🧊 Estado ICE:", iceState);
    };

    // Log de estado de gathering
    this.peerConnection.onicegatheringstatechange = () => {
      const gatheringState = this.peerConnection?.iceGatheringState;
      console.log("🧊 Estado de gathering:", gatheringState);
    };

    // Manejar stream remoto
    this.peerConnection.ontrack = (event) => {
      console.log("📻 Stream remoto recibido");
      console.log("📻 Track recibido:", event.track.kind, "- Enabled:", event.track.enabled);
      console.log("📻 Streams:", event.streams.length);
      
      this.remoteStream = event.streams[0];
      
      // Log de los tracks de audio
      const audioTracks = this.remoteStream.getAudioTracks();
      console.log("📻 Audio tracks en stream remoto:", audioTracks.length);
      audioTracks.forEach((track, index) => {
        console.log(`📻 Audio track ${index}:`, {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        });
      });
      
      if (this.onRemoteStreamCallback) {
        this.onRemoteStreamCallback(this.remoteStream);
      }
    };

    console.log("✅ Peer connection creado");
  }

  /**
   * Crear offer
   */
  private async createOffer(): Promise<void> {
    if (!this.peerConnection) {
      console.error("❌ No hay peer connection");
      return;
    }

    try {
      console.log("📤 Creando offer...");
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendSignalingMessage(SignalingMessageType.OFFER, offer);
      console.log("✅ Offer enviado");
    } catch (error) {
      console.error("❌ Error al crear offer:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback("Error al iniciar la conexión de voz");
      }
    }
  }

  /**
   * Crear answer
   */
  private async createAnswer(): Promise<void> {
    if (!this.peerConnection) {
      console.error("❌ No hay peer connection");
      return;
    }

    try {
      console.log("📤 Creando answer...");
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.sendSignalingMessage(SignalingMessageType.ANSWER, answer);
      console.log("✅ Answer enviado");
    } catch (error) {
      console.error("❌ Error al crear answer:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback("Error al responder la conexión de voz");
      }
    }
  }

  /**
   * Manejar mensajes de señalización
   */
  private async handleSignalingMessage(message: any): Promise<void> {
    try {
      console.log("📨 Mensaje de señalización recibido:", message.type);
      
      const signalingMsg = message.payload as SignalingMessage;

      if (!this.peerConnection) {
        console.error("❌ No hay peer connection para procesar mensaje");
        return;
      }

      switch (signalingMsg.type) {
        case SignalingMessageType.OFFER:
          console.log("📥 Procesando OFFER...");
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(signalingMsg.payload as RTCSessionDescriptionInit)
          );
          await this.createAnswer();
          break;

        case SignalingMessageType.ANSWER:
          console.log("📥 Procesando ANSWER...");
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(signalingMsg.payload as RTCSessionDescriptionInit)
          );
          break;

        case SignalingMessageType.ICE_CANDIDATE:
          console.log("📥 Procesando ICE_CANDIDATE...");
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(signalingMsg.payload as RTCIceCandidateInit)
          );
          break;

        default:
          console.warn("⚠️ Tipo de mensaje desconocido:", signalingMsg.type);
      }
    } catch (error) {
      console.error("❌ Error al procesar mensaje de señalización:", error);
    }
  }

  /**
   * Enviar mensaje de señalización
   */
  private sendSignalingMessage(
    type: SignalingMessageType,
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit
  ): void {
    if (!this.gameId || !this.localPlayerId || !this.remotePlayerId) {
      console.error("❌ Faltan datos para enviar mensaje de señalización");
      return;
    }

    const message: SignalingMessage = {
      type,
      gameId: this.gameId,
      senderId: this.localPlayerId,
      targetId: this.remotePlayerId,
      payload,
      timestamp: new Date().toISOString(),
    };

    webSocketService.send("/app/webrtc/signal", message);
    console.log(`📤 Mensaje de señalización enviado: ${type}`);
  }

  /**
   * Silenciar/Activar micrófono
   */
  public toggleMute(): boolean {
    if (!this.localStream) return this.isMuted;

    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });

    console.log(this.isMuted ? "🔇 Micrófono silenciado" : "🎤 Micrófono activado");
    return this.isMuted;
  }

  /**
   * Obtener estado del micrófono
   */
  public isMicMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Obtener stream local
   */
  public getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Obtener stream remoto
   */
  public getRemoteStream(): MediaStream | null {
    return this.remoteStream;
  }

  /**
   * Cerrar conexión
   */
  public close(): void {
    console.log("🔌 Cerrando chat de voz...");

    // Cerrar peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Detener stream local
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    // Limpiar stream remoto
    this.remoteStream = null;

    // Desuscribirse
    if (this.gameId) {
      webSocketService.unsubscribe(`/user/queue/webrtc/${this.gameId}`);
    }

    this.updateConnectionState("closed");
    console.log("✅ Chat de voz cerrado");
  }

  /**
   * Actualizar estado de conexión
   */
  private updateConnectionState(state: VoiceConnectionState): void {
    if (this.onConnectionStateChangeCallback) {
      this.onConnectionStateChangeCallback(state);
    }
  }

  /**
   * Callbacks
   */
  public onConnectionStateChange(callback: ConnectionStateCallback): void {
    this.onConnectionStateChangeCallback = callback;
  }

  public onRemoteStream(callback: RemoteStreamCallback): void {
    this.onRemoteStreamCallback = callback;
  }

  public onError(callback: ErrorCallback): void {
    this.onErrorCallback = callback;
  }
}

// Singleton
export const voiceChatService = new VoiceChatService();

