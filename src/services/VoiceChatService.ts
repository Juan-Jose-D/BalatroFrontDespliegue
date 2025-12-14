/**
 * Servicio de chat de voz usando WebRTC
 * Utiliza Cognito usernames como identificadores únicos
 */

import { webSocketService } from "./WebSocketService";
import type { SignalingMessage, VoiceConnectionState, WebRTCSignalWrapper } from "../types/voiceChat";
import { SignalingMessageType } from "../types/voiceChat";
import { normalizeCognitoUsername } from "../utils/voiceChat";

type ConnectionStateCallback = (state: VoiceConnectionState) => void;
type RemoteStreamCallback = (stream: MediaStream) => void;
type ErrorCallback = (error: string) => void;

export class VoiceChatService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  
  private gameId: string | null = null;
  private localCognitoUsername: string | null = null;
  private remoteCognitoUsername: string | null = null;
  
  private isMuted: boolean = false;
  private isInitiator: boolean = false;
  
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet: boolean = false;
  private offerTimeoutId: NodeJS.Timeout | null = null;
  private hasReceivedOffer: boolean = false;
  
  private onConnectionStateChangeCallback: ConnectionStateCallback | null = null;
  private onRemoteStreamCallback: RemoteStreamCallback | null = null;
  private onErrorCallback: ErrorCallback | null = null;
  
  private availableDevices: MediaDeviceInfo[] = [];
  private currentDeviceId: string | null = null;
  
  private iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  /**
   * Listar dispositivos de audio disponibles
   */
  public async listAudioDevices(): Promise<MediaDeviceInfo[]> {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      console.log("🎤 Dispositivos de audio disponibles:", audioInputs.length);
      this.availableDevices = audioInputs;
      return audioInputs;
    } catch (error) {
      console.error("❌ Error al listar dispositivos de audio:", error);
      return [];
    }
  }

  /**
   * Inicializar el chat de voz
   * @param gameId - ID del juego
   * @param localCognitoUsername - Username de Cognito del jugador local
   * @param remoteCognitoUsername - Username de Cognito del jugador remoto
   * @param isInitiator - Si este jugador es el iniciador
   */
  public async initialize(
    gameId: string,
    localCognitoUsername: string,
    remoteCognitoUsername: string,
    isInitiator: boolean = false
  ): Promise<void> {
    console.log("🎤 Inicializando chat de voz con Cognito...", { 
      gameId, 
      localCognitoUsername, 
      remoteCognitoUsername, 
      isInitiator 
    });
    
    // Validaciones críticas
    if (!localCognitoUsername || !remoteCognitoUsername) {
      throw new Error("Faltan usernames de Cognito necesarios para el chat de voz");
    }

    const normalizedLocal = normalizeCognitoUsername(localCognitoUsername);
    const normalizedRemote = normalizeCognitoUsername(remoteCognitoUsername);

    if (normalizedLocal === normalizedRemote) {
      throw new Error("Los usernames de Cognito no pueden ser iguales");
    }

    // Verificar que sean usernames de Cognito válidos (no UUIDs ni IDs aleatorios)
    if (localCognitoUsername.startsWith('player-') || 
        remoteCognitoUsername.startsWith('player-') ||
        localCognitoUsername.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ||
        remoteCognitoUsername.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      throw new Error("Los identificadores deben ser usernames de Cognito válidos, no UUIDs ni IDs aleatorios");
    }
    
    // Recalcular isInitiator para asegurar consistencia
    // Ambos jugadores deben llegar a la misma conclusión
    const recalculatedIsInitiator = normalizedLocal < normalizedRemote;
    
    console.log("🎯 Verificación de iniciador:", {
      localCognitoUsername,
      remoteCognitoUsername,
      normalizedLocal,
      normalizedRemote,
      isInitiatorParam: isInitiator,
      recalculatedIsInitiator,
      comparison: `"${normalizedLocal}" < "${normalizedRemote}" = ${recalculatedIsInitiator}`,
      usando: recalculatedIsInitiator ? "RECALCULADO" : "PARÁMETRO"
    });
    
    // Usar el valor recalculado para asegurar consistencia
    this.gameId = gameId;
    this.localCognitoUsername = localCognitoUsername;
    this.remoteCognitoUsername = remoteCognitoUsername;
    this.isInitiator = recalculatedIsInitiator; // Usar el valor recalculado

    try {
      // Listar dispositivos
      await this.listAudioDevices();
      
      // Seleccionar dispositivo
      const deviceToUse = this.availableDevices.find(d => 
        d.deviceId !== 'default' && 
        d.deviceId !== 'communications' &&
        d.label && 
        !d.label.toLowerCase().includes('steam')
      ) || this.availableDevices[0];
      
      if (deviceToUse) {
        this.currentDeviceId = deviceToUse.deviceId;
      }
      
      // Obtener acceso al micrófono
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1
      };
      
      if (deviceToUse && deviceToUse.deviceId !== 'default') {
        audioConstraints.deviceId = { exact: deviceToUse.deviceId };
      }
      
      console.log("🎤 Solicitando acceso al micrófono...");
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
      
      console.log("✅ Acceso al micrófono obtenido");
      
      // Crear peer connection
      this.createPeerConnection();
      
      // El handler de onnegotiationneeded se configura en createPeerConnection
      // para que esté disponible siempre

      // Agregar tracks locales
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Verificar WebSocket
      if (!webSocketService.isWebSocketConnected()) {
        throw new Error("WebSocket no está conectado. Por favor, espera a que la conexión se establezca.");
      }

      // Registrar sesión
      try {
        await webSocketService.registerSession();
        console.log("✅ Sesión registrada correctamente en el backend");
      } catch (error) {
        console.error("❌ Error al registrar sesión:", error);
        throw new Error("No se pudo registrar la sesión. Verifica que estés autenticado.");
      }

      // Suscribirse a mensajes de señalización
      // IMPORTANTE: Desuscribirse de cualquier suscripción anterior al mismo tópico
      const signalingTopic = `/user/queue/webrtc/${gameId}`;
      console.log(`🔔 Suscribiéndose a mensajes de señalización: ${signalingTopic}`);
      
      // Limpiar suscripción anterior si existe (para evitar duplicados)
      webSocketService.unsubscribe(signalingTopic);
      
      // Esperar un momento antes de suscribirse para asegurar que la limpieza se complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Suscribirse con el handler
      webSocketService.subscribe(signalingTopic, this.handleSignalingMessage.bind(this));
      console.log(`✅ Suscrito a ${signalingTopic}`);
      
      // Esperar un momento adicional para asegurar que la suscripción esté activa
      await new Promise(resolve => setTimeout(resolve, 300));

      // Si es el iniciador, crear OFFER
      if (this.isInitiator) {
        console.log("🎯 ========== ESTE JUGADOR ES EL INICIADOR ==========");
        console.log("🎯 Local Cognito Username:", normalizedLocal);
        console.log("🎯 Remote Cognito Username:", normalizedRemote);
        console.log("🎯 Comparación:", `"${normalizedLocal}" < "${normalizedRemote}" = ${normalizedLocal < normalizedRemote}`);
        console.log("🎯 Enviará OFFER a:", normalizedRemote);
        console.log("🎯 El backend debe enrutar usando el targetId normalizado");
        console.log("🎯 Esperando un momento antes de crear OFFER...");
        
        // Esperar más tiempo para asegurar que el receptor esté listo
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await this.createOffer();
        console.log("✅ OFFER creado y enviado");
        console.log("🎯 ==========================================");
      } else {
        console.log("⏳ ========== ESTE JUGADOR ES EL RECEPTOR ==========");
        console.log("⏳ Local Cognito Username:", normalizedLocal);
        console.log("⏳ Remote Cognito Username:", normalizedRemote);
        console.log("⏳ Comparación:", `"${normalizedLocal}" < "${normalizedRemote}" = ${normalizedLocal < normalizedRemote}`);
        console.log("⏳ Esperando OFFER de:", normalizedRemote);
        console.log("⏳ Este jugador está suscrito a: /user/queue/webrtc/" + gameId);
        console.log("⏳ El otro jugador debería ser el INICIADOR");
        console.log("⏳ ==========================================");
        
        this.hasReceivedOffer = false;
        this.offerTimeoutId = setTimeout(() => {
          if (!this.hasReceivedOffer) {
            console.warn("⚠️ TIMEOUT: No se recibió el OFFER después de 8 segundos");
            console.warn("⚠️ Posibles causas:");
            console.warn("   1. El otro jugador no está conectado al WebSocket");
            console.warn("   2. El otro jugador no ha iniciado el chat de voz");
            console.warn("   3. El backend no está enrutando correctamente los mensajes");
            console.warn("   4. Los usernames de Cognito no coinciden entre frontend y backend");
            console.warn("   5. El otro jugador también está esperando (problema de determinación del iniciador)");
            console.warn("⚠️ Verifica:");
            console.warn("   - Que ambos jugadores estén autenticados con Cognito");
            console.warn("   - Que el backend esté corriendo y procesando mensajes");
            console.warn("   - Que el backend use usernames de Cognito (no UUIDs) en MATCH_FOUND");
            console.warn("   - Que ambos jugadores hayan determinado correctamente quién es el iniciador");
            // No mostrar error al usuario, solo log en consola
          }
        }, 8000); // Aumentado a 8 segundos
      }

      this.updateConnectionState("connecting");
    } catch (error) {
      console.error("❌ Error al inicializar chat de voz:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback(error instanceof Error ? error.message : "Error desconocido");
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
        this.sendSignalingMessage(SignalingMessageType.ICE_CANDIDATE, event.candidate);
      }
    };

    // Manejar cambios de estado
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      if (state) {
        console.log("🔄 Estado de conexión:", state);
        this.updateConnectionState(state as VoiceConnectionState);
      }
    };

    // Manejar stream remoto
    this.peerConnection.ontrack = (event) => {
      console.log("📻 Stream remoto recibido");
      if (event.streams && event.streams.length > 0) {
        this.remoteStream = event.streams[0];
        if (this.onRemoteStreamCallback) {
          setTimeout(() => {
            if (this.remoteStream && this.onRemoteStreamCallback) {
              this.onRemoteStreamCallback(this.remoteStream);
            }
          }, 100);
        }
      } else if (event.track) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream([event.track]);
        } else {
          this.remoteStream.addTrack(event.track);
        }
        if (this.onRemoteStreamCallback) {
          setTimeout(() => {
            if (this.remoteStream && this.onRemoteStreamCallback) {
              this.onRemoteStreamCallback(this.remoteStream);
            }
          }, 100);
        }
      }
    };

    // Manejar evento de renegociación necesaria
    // Esto se dispara cuando se necesita renegociar (por ejemplo, al cambiar de dispositivo)
    this.peerConnection.onnegotiationneeded = async () => {
      console.log("🔄 Evento 'negotiationneeded' disparado - se requiere renegociación");
      console.log("🔄 Esto puede ocurrir al cambiar de dispositivo si el navegador lo requiere");
      
      // Solo renegociar si:
      // 1. Ya hay una conexión establecida o en proceso
      // 2. Somos el iniciador (solo el iniciador crea offers)
      // 3. No estamos en medio de otra renegociación
      if (this.peerConnection && 
          this.isInitiator &&
          (this.peerConnection.connectionState === 'connected' || 
           this.peerConnection.connectionState === 'connecting')) {
        console.log("🔄 Iniciando renegociación como iniciador...");
        try {
          // Esperar un momento para evitar renegociaciones múltiples
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Verificar que aún se necesita renegociación
          if (this.peerConnection && this.peerConnection.signalingState !== 'stable') {
            console.log("⏳ Ya hay una renegociación en curso, esperando...");
            return;
          }
          
          await this.createOffer();
          console.log("✅ Renegociación completada después del cambio de dispositivo");
        } catch (error) {
          console.error("❌ Error durante la renegociación:", error);
          if (this.onErrorCallback) {
            this.onErrorCallback(`Error durante la renegociación: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          }
        }
      } else {
        console.log("⏳ No se puede renegociar ahora:", {
          tienePeerConnection: !!this.peerConnection,
          esInitiator: this.isInitiator,
          connectionState: this.peerConnection?.connectionState
        });
      }
    };

    console.log("✅ Peer connection creado");
  }

  /**
   * Crear offer
   */
  private async createOffer(): Promise<void> {
    console.log("🎯 [createOffer] INICIO - Verificando condiciones...");
    
    if (!this.peerConnection) {
      console.error("❌ [createOffer] ERROR: No hay peer connection");
      throw new Error("No hay peer connection");
    }
    
    console.log("🎯 [createOffer] PeerConnection existe, estado:", this.peerConnection.connectionState);
    console.log("🎯 [createOffer] Signaling state:", this.peerConnection.signalingState);
    console.log("🎯 [createOffer] ICE connection state:", this.peerConnection.iceConnectionState);
    console.log("🎯 [createOffer] ICE gathering state:", this.peerConnection.iceGatheringState);

    console.log("📤 Creando offer...");
    
    try {
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      
      console.log("✅ [createOffer] Offer creado exitosamente:", offer.type);
      
      await this.peerConnection.setLocalDescription(offer);
      console.log("✅ Local description establecida (offer)");
      
      console.log("📤 [createOffer] Enviando signaling message...");
      this.sendSignalingMessage(SignalingMessageType.OFFER, offer);
      console.log("✅ Offer enviado a:", this.remoteCognitoUsername);
    } catch (error) {
      console.error("❌ [createOffer] ERROR al crear o enviar offer:", error);
      throw error;
    }
  }

  /**
   * Crear answer
   */
  private async createAnswer(): Promise<void> {
    if (!this.peerConnection) {
      throw new Error("No hay peer connection");
    }

    console.log("📤 Creando answer...");
    
    const answer = await this.peerConnection.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    
    await this.peerConnection.setLocalDescription(answer);
    console.log("✅ Local description establecida (answer)");
    
    await this.processPendingIceCandidates();
    
    this.sendSignalingMessage(SignalingMessageType.ANSWER, answer);
    console.log("✅ Answer enviado");
  }

  /**
   * Procesar ICE candidates pendientes
   */
  private async processPendingIceCandidates(): Promise<void> {
    if (!this.peerConnection || this.pendingIceCandidates.length === 0) {
      return;
    }

    console.log(`📥 Procesando ${this.pendingIceCandidates.length} ICE candidates pendientes...`);
    
    for (const candidate of this.pendingIceCandidates) {
      try {
        await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (error) {
        console.error("❌ Error al agregar ICE candidate:", error);
      }
    }
    
    this.pendingIceCandidates = [];
  }

  /**
   * Manejar mensajes de señalización
   * El backend envía mensajes en formato: { type: "WEBRTC_SIGNAL", payload: { ... } }
   */
  private async handleSignalingMessage(message: any): Promise<void> {
    try {
      console.log("📨 ========== MENSAJE DE SEÑALIZACIÓN RECIBIDO ==========");
      console.log("📨 Mensaje completo:", JSON.stringify(message, null, 2));
      console.log("📨 Tipo de mensaje:", message.type);
      console.log("📨 Tiene payload:", !!message.payload);
      
      let signalingMsg: SignalingMessage;
      
      // El backend envía el mensaje envuelto: { type: "WEBRTC_SIGNAL", payload: { ... } }
      if (message.type === "WEBRTC_SIGNAL" && message.payload) {
        const wrapper = message as WebRTCSignalWrapper;
        const payload = wrapper.payload;
        
        console.log("📨 Mensaje desenvuelto del backend:");
        console.log("📨   Remitente (senderId):", payload.senderId);
        console.log("📨   Destinatario (targetId):", payload.targetId);
        console.log("📨   Tipo de señal:", payload.type);
        console.log("📨   GameId:", payload.gameId);
        
        // Crear SignalingMessage desde el payload
        signalingMsg = {
          type: payload.type,
          gameId: payload.gameId,
          targetId: payload.targetId,
          payload: payload.payload,
        };
      } else if (message.type && (message.type === "OFFER" || message.type === "ANSWER" || message.type === "ICE_CANDIDATE")) {
        // Por si acaso el backend envía el mensaje directo (sin envolver)
        console.log("📨 Mensaje directo detectado (sin envolver)");
        signalingMsg = {
          type: message.type,
          gameId: message.gameId,
          targetId: message.targetId,
          payload: message.payload,
        };
      } else {
        console.error("❌ Formato de mensaje incorrecto");
        console.error("❌ Estructura esperada: { type: 'WEBRTC_SIGNAL', payload: { type, gameId, senderId, targetId, payload, timestamp } }");
        console.error("❌ Mensaje recibido:", message);
        return;
      }
      
      if (!this.peerConnection || !signalingMsg || !signalingMsg.type) {
        console.error("❌ No hay peer connection o mensaje inválido");
        return;
      }

      // Verificar destinatario usando usernames de Cognito normalizados
      // El backend envía el targetId normalizado
      const normalizedTarget = normalizeCognitoUsername(signalingMsg.targetId);
      const normalizedLocal = normalizeCognitoUsername(this.localCognitoUsername!);
      
      if (normalizedTarget !== normalizedLocal) {
        console.warn("⚠️ Mensaje no es para este jugador:", {
          targetId: signalingMsg.targetId,
          normalizedTarget,
          localCognitoUsername: this.localCognitoUsername,
          normalizedLocal
        });
        return;
      }

      console.log("✅ Mensaje es para este jugador, procesando tipo:", signalingMsg.type);

      switch (signalingMsg.type) {
        case SignalingMessageType.OFFER:
          this.hasReceivedOffer = true;
          if (this.offerTimeoutId) {
            clearTimeout(this.offerTimeoutId);
            this.offerTimeoutId = null;
          }
          console.log("📥 Procesando OFFER...");
          try {
            const offer = signalingMsg.payload as RTCSessionDescriptionInit;
            if (!offer || !offer.sdp) {
              throw new Error("Offer inválido");
            }
            
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
            this.isRemoteDescriptionSet = true;
            
            await this.processPendingIceCandidates();
            await this.createAnswer();
          } catch (error) {
            console.error("❌ Error al procesar OFFER:", error);
            if (this.onErrorCallback) {
              this.onErrorCallback(`Error al procesar OFFER: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            }
          }
          break;

        case SignalingMessageType.ANSWER:
          console.log("📥 Procesando ANSWER...");
          try {
            const answer = signalingMsg.payload as RTCSessionDescriptionInit;
            if (!answer || !answer.sdp) {
              throw new Error("Answer inválido");
            }
            
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
            this.isRemoteDescriptionSet = true;
            
            await this.processPendingIceCandidates();
          } catch (error) {
            console.error("❌ Error al procesar ANSWER:", error);
            if (this.onErrorCallback) {
              this.onErrorCallback(`Error al procesar ANSWER: ${error instanceof Error ? error.message : 'Error desconocido'}`);
            }
          }
          break;

        case SignalingMessageType.ICE_CANDIDATE:
          console.log("📥 Procesando ICE_CANDIDATE...");
          try {
            const candidate = signalingMsg.payload as RTCIceCandidateInit;
            if (!candidate) {
              throw new Error("ICE candidate inválido");
            }

            if (!this.isRemoteDescriptionSet) {
              this.pendingIceCandidates.push(candidate);
              return;
            }

            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (error) {
            console.error("❌ Error al procesar ICE_CANDIDATE:", error);
          }
          break;

        default:
          console.warn("⚠️ Tipo de mensaje desconocido:", signalingMsg.type);
      }
    } catch (error) {
      console.error("❌ Error al procesar mensaje de señalización:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback(`Error al procesar mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }
  }

  /**
   * Enviar mensaje de señalización
   */
  private sendSignalingMessage(
    type: SignalingMessageType,
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit
  ): void {
    if (!this.gameId || !this.localCognitoUsername || !this.remoteCognitoUsername) {
      console.error("❌ Faltan datos para enviar mensaje");
      return;
    }

    if (!webSocketService.isWebSocketConnected()) {
      console.error("❌ WebSocket no está conectado");
      if (this.onErrorCallback) {
        this.onErrorCallback("WebSocket no está conectado. Verifica tu conexión.");
      }
      return;
    }

    // Normalizar usernames antes de enviar
    const normalizedSender = normalizeCognitoUsername(this.localCognitoUsername);
    const normalizedTarget = normalizeCognitoUsername(this.remoteCognitoUsername);

    if (normalizedSender === normalizedTarget) {
      console.error("❌ ERROR: sender y target son iguales después de normalizar!");
      if (this.onErrorCallback) {
        this.onErrorCallback("Error: Los usernames de Cognito son iguales. No se puede establecer la conexión.");
      }
      return;
    }

    // El backend extrae el senderId del Principal (username de Cognito del token JWT)
    // Solo necesitamos enviar el targetId (username de Cognito del destinatario normalizado)
    // Formato esperado por el backend: { type, gameId, targetId, payload, timestamp }
    const message: SignalingMessage = {
      type,
      gameId: this.gameId!,
      targetId: normalizedTarget, // Username de Cognito del destinatario normalizado (lowercase, trim)
      payload,
      timestamp: new Date().toISOString(), // Incluir timestamp (recomendado)
    };

    console.log(`📤 ========== ENVIANDO SEÑAL WEBRTC ==========`);
    console.log(`📤 Tipo: ${type}`);
    console.log(`📤 GameId: ${this.gameId}`);
    console.log(`📤 TargetId (destinatario): ${normalizedTarget}`);
    console.log(`📤 Local Cognito Username (remitente): ${normalizedSender}`);
    console.log(`📤 Nota: El backend extraerá el senderId del Principal (token JWT en header Authorization)`);
    console.log(`📤 Payload type: ${type === SignalingMessageType.OFFER || type === SignalingMessageType.ANSWER ? 'SDP' : 'ICE_CANDIDATE'}`);
    console.log(`📤 Mensaje completo:`, JSON.stringify(message, null, 2));
    
    // Verificar que el WebSocket tenga el token en el header Authorization
    const hasToken = webSocketService.isWebSocketConnected();
    if (!hasToken) {
      console.error("❌ WebSocket no está conectado o no tiene token");
      if (this.onErrorCallback) {
        this.onErrorCallback("WebSocket no está conectado con autenticación. Verifica que el token esté en el header Authorization.");
      }
      return;
    }
    
    webSocketService.send("/app/webrtc/signal", message);
    console.log(`✅ Mensaje de señalización ${type} enviado exitosamente`);
    console.log(`✅ El backend debe:`);
    console.log(`   1. Extraer el senderId del Principal (username de Cognito del token)`);
    console.log(`   2. Normalizar el targetId recibido`);
    console.log(`   3. Buscar la sesión del destinatario usando el targetId normalizado`);
    console.log(`   4. Enrutar el mensaje a /user/queue/webrtc/${this.gameId} del destinatario`);
    console.log(`📤 ==========================================`);
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
   * Obtener lista de dispositivos de audio disponibles
   */
  public getAvailableDevices(): MediaDeviceInfo[] {
    return this.availableDevices;
  }

  /**
   * Obtener dispositivo actual
   */
  public getCurrentDeviceId(): string | null {
    return this.currentDeviceId;
  }

  /**
   * Cambiar dispositivo de audio
   */
  public async changeDevice(deviceId: string): Promise<void> {
    if (!this.localStream) {
      throw new Error("No hay stream local activo");
    }

    console.log("🔄 Cambiando dispositivo de audio a:", deviceId);
    
    const device = this.availableDevices.find(d => d.deviceId === deviceId);
    if (!device) {
      throw new Error("Dispositivo no encontrado");
    }

    // Detener tracks actuales
    this.localStream.getAudioTracks().forEach(track => track.stop());

    // Obtener nuevo stream
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId },
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1
      },
      video: false,
    });

    // Reemplazar tracks
    const oldTracks = this.localStream.getAudioTracks();
    const newTracks = newStream.getAudioTracks();
    
    oldTracks.forEach(track => this.localStream!.removeTrack(track));
    newTracks.forEach(track => this.localStream!.addTrack(track));

    // Actualizar senders en peer connection y manejar renegociación si es necesaria
    if (this.peerConnection) {
      const senders = this.peerConnection.getSenders();
      let trackReplaced = false;
      
      for (const sender of senders) {
        if (sender.track && sender.track.kind === 'audio') {
          const newTrack = newTracks[0];
          if (newTrack) {
            try {
              await sender.replaceTrack(newTrack);
              trackReplaced = true;
              console.log("✅ Track reemplazado en sender");
            } catch (err) {
              console.error("❌ Error al reemplazar track:", err);
              // Si replaceTrack falla, puede ser necesario renegociar
              console.warn("⚠️ replaceTrack falló, puede ser necesario renegociar");
            }
          }
        }
      }
      
      // Verificar si se necesita renegociación
      // El evento 'negotiationneeded' se disparará automáticamente si es necesario
      if (trackReplaced) {
        console.log("🔄 Verificando si se necesita renegociación...");
        
        // Esperar un momento para ver si se dispara el evento negotiationneeded
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar el estado de la conexión
        const connectionState = this.peerConnection.connectionState;
        const iceConnectionState = this.peerConnection.iceConnectionState;
        
        console.log("📊 Estado de conexión después del cambio:", {
          connectionState,
          iceConnectionState,
          trackReemplazado: trackReplaced
        });
        
        // Si la conexión está establecida, el replaceTrack debería ser suficiente
        // El evento negotiationneeded se disparará automáticamente si el navegador lo requiere
      }
    }

    // Cerrar stream temporal (solo los tracks que no están en localStream)
    newStream.getTracks().forEach(track => {
      if (!this.localStream!.getTracks().includes(track)) {
        track.stop();
      }
    });

    // Mantener el estado de mute
    if (this.isMuted) {
      newTracks.forEach(track => {
        track.enabled = false;
      });
    }

    this.currentDeviceId = deviceId;
    console.log("✅ Dispositivo cambiado a:", device.label);
  }

  /**
   * Cerrar conexión
   */
  public close(): void {
    console.log("🔌 Cerrando chat de voz...");

    // Limpiar timeout
    if (this.offerTimeoutId) {
      clearTimeout(this.offerTimeoutId);
      this.offerTimeoutId = null;
    }

    // Desuscribirse del tópico de señalización
    if (this.gameId) {
      const signalingTopic = `/user/queue/webrtc/${this.gameId}`;
      console.log(`🔌 Desuscribiéndose de ${signalingTopic}...`);
      webSocketService.unsubscribe(signalingTopic);
    }

    // Cerrar peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    // Detener streams
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    // Limpiar estado
    this.pendingIceCandidates = [];
    this.isRemoteDescriptionSet = false;
    this.hasReceivedOffer = false;

    this.updateConnectionState("closed");
    console.log("✅ Chat de voz cerrado completamente");
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

