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
  
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet: boolean = false;
  
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
      // Solicitar permisos primero
      await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Listar dispositivos
      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(device => device.kind === 'audioinput');
      
      console.log("🎤 Dispositivos de audio disponibles:", audioInputs.length);
      audioInputs.forEach((device, index) => {
        console.log(`🎤 Dispositivo ${index}:`, {
          deviceId: device.deviceId,
          label: device.label || 'Sin nombre',
          kind: device.kind,
          groupId: device.groupId
        });
      });
      
      return audioInputs;
    } catch (error) {
      console.error("❌ Error al listar dispositivos de audio:", error);
      return [];
    }
  }

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
      // Listar dispositivos disponibles primero
      this.availableDevices = await this.listAudioDevices();
      
      // Usar el dispositivo actual si ya está seleccionado, sino seleccionar uno
      let deviceToUse: MediaDeviceInfo | null = null;
      
      if (this.currentDeviceId) {
        deviceToUse = this.availableDevices.find(d => d.deviceId === this.currentDeviceId) || null;
        if (deviceToUse) {
          console.log("🎤 Usando micrófono seleccionado:", deviceToUse.label);
        } else {
          console.warn("⚠️ Dispositivo seleccionado no encontrado, usando predeterminado");
          this.currentDeviceId = null;
        }
      }
      
      // Si no hay dispositivo seleccionado, intentar usar uno preferido
      if (!deviceToUse) {
        // Prioridad 1: Dispositivos con nombres reales (no "default" ni "communications")
        // Excluir Steam y preferir dispositivos con nombres descriptivos
        const realDevices = this.availableDevices.filter(d => 
          d.deviceId !== 'default' && 
          d.deviceId !== 'communications' &&
          d.label && 
          d.label.trim() !== '' &&
          !d.label.toLowerCase().includes('steam') &&
          !d.label.toLowerCase().includes('default')
        );
        
        console.log("🎤 Dispositivos reales disponibles:", realDevices.map(d => d.label));
        
        if (realDevices.length > 0) {
          // Preferir dispositivos que no sean "communications" y tengan nombres descriptivos
          // Ordenar por preferencia: evitar "communications", preferir nombres con "Microphone" o "Mic"
          const preferredDevices = realDevices.filter(d => 
            !d.label.toLowerCase().includes('communications')
          );
          
          if (preferredDevices.length > 0) {
            // Ordenar: preferir dispositivos con "Microphone" o "Mic" en el nombre
            preferredDevices.sort((a, b) => {
              const aHasMic = a.label.toLowerCase().includes('mic') || a.label.toLowerCase().includes('microphone');
              const bHasMic = b.label.toLowerCase().includes('mic') || b.label.toLowerCase().includes('microphone');
              if (aHasMic && !bHasMic) return -1;
              if (!aHasMic && bHasMic) return 1;
              return 0;
            });
            
            deviceToUse = preferredDevices[0];
          } else {
            deviceToUse = realDevices[0];
          }
          
          console.log("🎤 Usando micrófono preferido:", deviceToUse.label);
        } else {
          // Si no hay dispositivos reales, intentar con "default" o el primero
          deviceToUse = this.availableDevices.find(d => d.deviceId === 'default') || this.availableDevices[0];
          if (deviceToUse) {
            console.log("⚠️ No se encontraron dispositivos reales, usando:", deviceToUse.label);
            console.log("⚠️ Se recomienda cambiar manualmente el micrófono si este no funciona");
          }
        }
        
        if (deviceToUse) {
          this.currentDeviceId = deviceToUse.deviceId;
        }
      }
      
      const audioConstraints: MediaTrackConstraints = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        sampleRate: 48000,
        channelCount: 1
      };
      
      // Si encontramos un dispositivo, usarlo
      if (deviceToUse && deviceToUse.deviceId !== 'default' && deviceToUse.deviceId !== 'communications') {
        audioConstraints.deviceId = { exact: deviceToUse.deviceId };
      }
      
      // Obtener acceso al micrófono con configuración más específica
      console.log("🎤 Solicitando acceso al micrófono...");
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
      
      console.log("✅ Acceso al micrófono obtenido");
      
      // Verificar tracks locales
      const localTracks = this.localStream.getAudioTracks();
      console.log("🎤 Tracks locales:", localTracks.length);
      localTracks.forEach((track, index) => {
        console.log(`🎤 Track ${index}:`, {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label
        });
        
        // Verificar configuración del track
        if (track.getSettings) {
          const settings = track.getSettings();
          console.log(`🎤 Configuración del track ${index}:`, settings);
        }
        
        // Verificar capacidades
        if (track.getCapabilities) {
          const capabilities = track.getCapabilities();
          console.log(`🎤 Capacidades del track ${index}:`, capabilities);
        }
      });
      
      // Verificar que el stream esté activo
      console.log("🎤 Stream local:", {
        id: this.localStream.id,
        active: this.localStream.active,
        tracks: this.localStream.getTracks().length
      });
      
      if (!this.localStream.active) {
        console.warn("⚠️ Stream local no está activo");
      }
      
      // Verificar que haya al menos un track habilitado
      const enabledTracks = localTracks.filter(t => t.enabled && t.readyState === 'live');
      if (enabledTracks.length === 0) {
        console.warn("⚠️ No hay tracks de audio habilitados y activos");
      }
      
      // Verificar que el micrófono esté capturando audio (no solo silencio)
      // Crear un analyzer temporal para verificar
      try {
        const audioContext = new AudioContext();
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 512;
        analyzer.smoothingTimeConstant = 0.3;
        
        const source = audioContext.createMediaStreamSource(this.localStream);
        source.connect(analyzer);
        
        const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
        
        // Verificar después de un momento
        setTimeout(() => {
          analyzer.getByteFrequencyData(frequencyData);
          const maxFrequency = Math.max(...Array.from(frequencyData));
          const averageFrequency = frequencyData.reduce((a, b) => a + b) / frequencyData.length;
          
          console.log("🎤 Verificación de captura de audio:", {
            maxFrequency,
            averageFrequency,
            hasAudio: maxFrequency > 1 || averageFrequency > 0.5
          });
          
          if (maxFrequency <= 1 && averageFrequency <= 0.5) {
            console.warn("⚠️ El micrófono no parece estar capturando audio (solo silencio)");
            console.warn("⚠️ Verifica que:");
            console.warn("   - El micrófono no esté silenciado en el sistema");
            console.warn("   - Estés hablando cerca del micrófono");
            console.warn("   - El micrófono esté conectado y funcionando");
          } else {
            console.log("✅ El micrófono está capturando audio");
          }
          
          audioContext.close();
        }, 1000);
      } catch (err) {
        console.warn("⚠️ No se pudo verificar captura de audio:", err);
      }
      
      // Crear peer connection
      this.createPeerConnection();

      // Agregar tracks locales al peer connection
      let tracksAdded = 0;
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          const sender = this.peerConnection.addTrack(track, this.localStream);
          tracksAdded++;
          console.log(`✅ Track ${track.kind} agregado:`, {
            trackId: track.id,
            senderTrackId: sender.track?.id
          });
        }
      });
      
      console.log(`✅ Total tracks agregados: ${tracksAdded}`);
      
      // Verificar senders en peer connection
      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders();
        console.log("📊 Senders en peer connection:", senders.length);
        senders.forEach((sender, index) => {
          if (sender.track) {
            console.log(`📊 Sender ${index}:`, {
              trackId: sender.track.id,
              trackKind: sender.track.kind,
              trackEnabled: sender.track.enabled
            });
          }
        });
      }

      // Verificar conexión WebSocket
      if (!webSocketService.isWebSocketConnected()) {
        throw new Error("WebSocket no está conectado");
      }

      // Registrar sesión si es necesario
      try {
        await webSocketService.registerSession();
      } catch (error) {
        console.warn("⚠️ Error al registrar sesión:", error);
      }

      // Suscribirse a mensajes de señalización
      webSocketService.subscribe(
        `/user/queue/webrtc/${gameId}`,
        this.handleSignalingMessage.bind(this)
      );
      
      await new Promise(resolve => setTimeout(resolve, 300));

      // Si es el iniciador, crear OFFER
      if (this.isInitiator) {
        await new Promise(resolve => setTimeout(resolve, 1000));
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
        this.sendSignalingMessage(SignalingMessageType.ICE_CANDIDATE, event.candidate);
      }
    };

    // Manejar cambios de estado de la conexión
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState;
      const iceConnectionState = this.peerConnection?.iceConnectionState;
      const iceGatheringState = this.peerConnection?.iceGatheringState;
      const signalingState = this.peerConnection?.signalingState;
      
      console.log("🔄 Estado de conexión:", {
        connectionState: state,
        iceConnectionState,
        iceGatheringState,
        signalingState,
        remoteStream: !!this.remoteStream,
        remoteTracks: this.remoteStream?.getTracks().length || 0
      });
      
      if (state) {
        this.updateConnectionState(state as VoiceConnectionState);
      }
      
      // Si la conexión está conectada pero no hay stream remoto, intentar verificar
      if (state === 'connected' && !this.remoteStream && this.peerConnection) {
        console.warn("⚠️ Conexión establecida pero no hay stream remoto");
        console.warn("⚠️ Verificando transceivers...");
        const transceivers = this.peerConnection.getTransceivers();
        console.log("📊 Transceivers:", transceivers.length);
        transceivers.forEach((transceiver, index) => {
          console.log(`📊 Transceiver ${index}:`, {
            direction: transceiver.direction,
            currentDirection: transceiver.currentDirection,
            receiver: !!transceiver.receiver,
            receiverTrack: transceiver.receiver?.track ? {
              id: transceiver.receiver.track.id,
              kind: transceiver.receiver.track.kind,
              enabled: transceiver.receiver.track.enabled,
              readyState: transceiver.receiver.track.readyState
            } : null,
            sender: !!transceiver.sender,
            senderTrack: transceiver.sender?.track ? {
              id: transceiver.sender.track.id,
              kind: transceiver.sender.track.kind
            } : null
          });
          
          // Si hay un receiver con track pero no está en el stream remoto
          if (transceiver.receiver?.track && !this.remoteStream) {
            console.log("📻 Encontrado track en transceiver, creando stream remoto");
            this.remoteStream = new MediaStream([transceiver.receiver.track]);
            if (this.onRemoteStreamCallback) {
              setTimeout(() => {
                if (this.remoteStream && this.onRemoteStreamCallback) {
                  console.log("📻 Notificando stream remoto desde transceiver");
                  this.onRemoteStreamCallback(this.remoteStream);
                }
              }, 100);
            }
          }
        });
      }
    };

    // Manejar stream remoto
    this.peerConnection.ontrack = (event) => {
      console.log("📻 Stream remoto recibido en ontrack");
      console.log("📻 Event info:", {
        streams: event.streams?.length || 0,
        track: event.track ? {
          id: event.track.id,
          kind: event.track.kind,
          enabled: event.track.enabled,
          readyState: event.track.readyState
        } : null
      });
      
      // Si hay streams en el evento, usar el primero
      if (event.streams && event.streams.length > 0) {
        const stream = event.streams[0];
        console.log("📻 Usando stream del evento:", {
          id: stream.id,
          active: stream.active,
          tracks: stream.getTracks().length,
          audioTracks: stream.getAudioTracks().length
        });
        
        // Si ya tenemos un stream, agregar tracks adicionales
        if (this.remoteStream && this.remoteStream.id !== stream.id) {
          const existingStream = this.remoteStream;
          stream.getTracks().forEach(track => {
            if (!existingStream.getTrackById(track.id)) {
              existingStream.addTrack(track);
              console.log("📻 Track agregado al stream existente:", track.id);
            }
          });
        } else {
          this.remoteStream = stream;
        }
      } else if (event.track) {
        // Si no hay stream pero hay track, crear o agregar al stream existente
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream([event.track]);
          console.log("📻 Nuevo stream creado desde track");
        } else {
          // Agregar track al stream existente si no está ya
          if (!this.remoteStream.getTrackById(event.track.id)) {
            this.remoteStream.addTrack(event.track);
            console.log("📻 Track agregado al stream existente:", event.track.id);
          }
        }
      }
      
      // Verificar que el stream tenga tracks de audio activos
      if (this.remoteStream) {
        const audioTracks = this.remoteStream.getAudioTracks();
        const allTracks = this.remoteStream.getTracks();
        
        console.log("📻 Stream remoto final:", {
          id: this.remoteStream.id,
          active: this.remoteStream.active,
          tracks: allTracks.length,
          audioTracks: audioTracks.length,
          audioTracksInfo: audioTracks.map(t => ({
            id: t.id,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
            label: t.label
          })),
          allTracksInfo: allTracks.map(t => ({
            id: t.id,
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState
          }))
        });
        
        // Asegurar que los tracks estén habilitados
        audioTracks.forEach(track => {
          console.log("📻 Verificando track remoto:", {
            id: track.id,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
            label: track.label
          });
          
          if (!track.enabled) {
            track.enabled = true;
            console.log("📻 Track habilitado:", track.id);
          }
          
          // Nota: 'muted' es una propiedad de solo lectura que indica si el track está capturando audio
          // Si está muted, significa que no hay audio siendo capturado/enviado
          if (track.muted) {
            console.warn("⚠️ Track remoto está muted - no hay audio siendo capturado/enviado");
            console.warn("⚠️ Esto puede significar que el otro jugador no está hablando o su micrófono no funciona");
          }
        });
        
        // Verificar que haya tracks antes de notificar
        if (audioTracks.length > 0) {
          console.log("✅ Stream remoto tiene tracks de audio, notificando al callback");
          if (this.onRemoteStreamCallback) {
            console.log("📻 Notificando stream remoto al callback");
            // Notificar de forma asíncrona para asegurar que el stream esté completamente configurado
            setTimeout(() => {
              if (this.remoteStream && this.onRemoteStreamCallback) {
                console.log("📻 Ejecutando callback de stream remoto");
                this.onRemoteStreamCallback(this.remoteStream);
              }
            }, 100);
          } else {
            console.warn("⚠️ No hay callback registrado para stream remoto");
          }
        } else {
          console.warn("⚠️ Stream remoto sin tracks de audio activos");
          console.warn("⚠️ Tracks totales:", allTracks.length);
          console.warn("⚠️ Tracks de audio:", audioTracks.length);
        }
      } else {
        console.warn("⚠️ No se pudo crear/obtener stream remoto del evento ontrack");
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
      
      // Verificar que haya tracks antes de crear el offer
      const senders = this.peerConnection.getSenders();
      const audioSenders = senders.filter(s => s.track && s.track.kind === 'audio');
      console.log("📤 Senders antes de crear offer:", {
        total: senders.length,
        audio: audioSenders.length,
        senders: senders.map(s => ({
          trackId: s.track?.id,
          trackKind: s.track?.kind,
          trackEnabled: s.track?.enabled
        }))
      });
      
      if (audioSenders.length === 0) {
        console.error("❌ No hay senders de audio antes de crear offer");
        return;
      }
      
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      
      // Verificar que el SDP incluya audio
      if (offer.sdp) {
        const hasAudio = offer.sdp.includes('m=audio');
        const hasOpus = offer.sdp.includes('opus');
        console.log("📤 SDP del OFFER:", {
          hasAudio,
          hasOpus,
          sdpLength: offer.sdp.length
        });
        
        if (!hasAudio) {
          console.error("❌ El SDP no incluye audio!");
        }
      }
      
      await this.peerConnection.setLocalDescription(offer);
      console.log("✅ Local description establecida (offer)");
      
      this.sendSignalingMessage(SignalingMessageType.OFFER, offer);
      console.log("✅ Offer enviado");
    } catch (error) {
      console.error("❌ Error al crear offer:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback(`Error al iniciar la conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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
      
      const answer = await this.peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      
      await this.peerConnection.setLocalDescription(answer);
      console.log("✅ Local description establecida (answer)");
      
      await this.processPendingIceCandidates();
      
      this.sendSignalingMessage(SignalingMessageType.ANSWER, answer);
      console.log("✅ Answer enviado");
    } catch (error) {
      console.error("❌ Error al crear answer:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback("Error al responder la conexión");
      }
    }
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
   */
  private async handleSignalingMessage(message: any): Promise<void> {
    try {
      console.log("📨 Mensaje de señalización recibido:", message);
      console.log("📨 Tipo de mensaje:", message.type);
      console.log("📨 Tiene payload:", !!message.payload);
      
      // El backend envuelve el mensaje en un objeto con type: "WEBRTC_SIGNAL"
      // El SignalingMessage real está en message.payload
      let signalingMsg: SignalingMessage;
      
      if (message.type === "WEBRTC_SIGNAL" && message.payload) {
        // Mensaje envuelto por el backend
        signalingMsg = message.payload as SignalingMessage;
        console.log("📨 Mensaje desenvuelto:", {
          type: signalingMsg.type,
          senderId: signalingMsg.senderId,
          targetId: signalingMsg.targetId,
          gameId: signalingMsg.gameId
        });
      } else if (message.type && message.gameId) {
        // Mensaje directo (por si acaso)
        signalingMsg = message as SignalingMessage;
        console.log("📨 Mensaje directo detectado");
      } else {
        console.error("❌ Formato de mensaje desconocido:", message);
        console.error("❌ Estructura del mensaje:", JSON.stringify(message, null, 2));
        return;
      }
      
      if (!this.peerConnection) {
        console.error("❌ No hay peer connection disponible");
        return;
      }
      
      if (!signalingMsg || !signalingMsg.type) {
        console.error("❌ Mensaje de señalización inválido:", signalingMsg);
        return;
      }

      // Verificar que el mensaje sea para este jugador
      console.log("📨 Verificando destinatario:", {
        targetId: signalingMsg.targetId,
        localPlayerId: this.localPlayerId,
        match: signalingMsg.targetId === this.localPlayerId
      });
      
      if (signalingMsg.targetId !== this.localPlayerId) {
        console.warn("⚠️ Mensaje no es para este jugador:", {
          targetId: signalingMsg.targetId,
          localPlayerId: this.localPlayerId
        });
        return;
      }
      
      console.log("✅ Mensaje es para este jugador, procesando tipo:", signalingMsg.type);

      switch (signalingMsg.type) {
        case SignalingMessageType.OFFER:
          console.log("📥 Procesando OFFER...");
          try {
            const offer = signalingMsg.payload as RTCSessionDescriptionInit;
            if (!offer || !offer.sdp) {
              throw new Error("Offer inválido");
            }
            
            await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription(offer)
            );
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
          console.log("📥 Estado antes de procesar ANSWER:", {
            connectionState: this.peerConnection.connectionState,
            signalingState: this.peerConnection.signalingState,
            iceConnectionState: this.peerConnection.iceConnectionState,
            hasRemoteStream: !!this.remoteStream,
            remoteTracks: this.remoteStream?.getTracks().length || 0
          });
          
          try {
            const answer = signalingMsg.payload as RTCSessionDescriptionInit;
            if (!answer || !answer.sdp) {
              throw new Error("Answer inválido");
            }
            
            console.log("📥 Answer SDP recibido:", {
              type: answer.type,
              sdpLength: answer.sdp?.length || 0,
              hasAudio: answer.sdp?.includes('m=audio') || false
            });
            
            await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription(answer)
            );
            this.isRemoteDescriptionSet = true;
            
            console.log("✅ Remote description establecida (answer)");
            console.log("📥 Estado después de establecer ANSWER:", {
              connectionState: this.peerConnection.connectionState,
              signalingState: this.peerConnection.signalingState,
              iceConnectionState: this.peerConnection.iceConnectionState
            });
            
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
          console.log("📥 Estado antes de procesar ICE_CANDIDATE:", {
            connectionState: this.peerConnection.connectionState,
            signalingState: this.peerConnection.signalingState,
            iceConnectionState: this.peerConnection.iceConnectionState,
            isRemoteDescriptionSet: this.isRemoteDescriptionSet,
            pendingCandidates: this.pendingIceCandidates.length
          });
          
          try {
            const candidate = signalingMsg.payload as RTCIceCandidateInit;
            if (!candidate) {
              throw new Error("ICE candidate inválido");
            }
            
            console.log("📥 ICE Candidate recibido:", {
              candidate: candidate.candidate?.substring(0, 50) + '...',
              sdpMid: candidate.sdpMid,
              sdpMLineIndex: candidate.sdpMLineIndex
            });

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
    if (!this.gameId || !this.localPlayerId || !this.remotePlayerId) {
      console.error("❌ Faltan datos para enviar mensaje");
      return;
    }

    if (!webSocketService.isWebSocketConnected()) {
      console.error("❌ WebSocket no está conectado");
      if (this.onErrorCallback) {
        this.onErrorCallback("WebSocket no está conectado");
      }
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

    console.log(`📤 Enviando mensaje de señalización: ${type}`);
    webSocketService.send("/app/webrtc/signal", message);
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
    
    // Obtener el dispositivo
    const device = this.availableDevices.find(d => d.deviceId === deviceId);
    if (!device) {
      throw new Error("Dispositivo no encontrado");
    }

    // Detener tracks actuales
    this.localStream.getAudioTracks().forEach(track => track.stop());

    // Obtener nuevo stream con el dispositivo seleccionado
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

    // Reemplazar tracks en el stream local
    const oldTracks = this.localStream.getAudioTracks();
    const newTracks = newStream.getAudioTracks();
    
    oldTracks.forEach(track => {
      this.localStream!.removeTrack(track);
    });
    
    newTracks.forEach(track => {
      this.localStream!.addTrack(track);
    });

    // Actualizar senders en peer connection
    if (this.peerConnection) {
      const senders = this.peerConnection.getSenders();
      console.log("🔄 Actualizando senders después de cambiar dispositivo:", {
        totalSenders: senders.length,
        audioSenders: senders.filter(s => s.track?.kind === 'audio').length
      });
      
      senders.forEach((sender, index) => {
        if (sender.track && sender.track.kind === 'audio') {
          const newTrack = newTracks[0];
          if (newTrack) {
            console.log(`🔄 Reemplazando track en sender ${index}:`, {
              oldTrackId: sender.track.id,
              newTrackId: newTrack.id
            });
            sender.replaceTrack(newTrack).then(() => {
              console.log(`✅ Track reemplazado en sender ${index}`);
            }).catch(err => {
              console.error(`❌ Error al reemplazar track en sender ${index}:`, err);
            });
          }
        }
      });
      
      // Si la conexión ya está establecida, puede ser necesario renegociar
      const connectionState = this.peerConnection.connectionState;
      const signalingState = this.peerConnection.signalingState;
      console.log("🔄 Estado de conexión después de cambiar dispositivo:", {
        connectionState,
        signalingState
      });
      
      // Si estamos en estado de negociación, necesitamos renegociar
      if (signalingState === 'have-local-offer') {
        console.log("⚠️ Cambio de dispositivo durante negociación (have-local-offer), renegociando...");
        // Si somos el iniciador y ya enviamos el OFFER, necesitamos crear uno nuevo
        if (this.isInitiator) {
          try {
            // Crear un nuevo OFFER con el nuevo track
            const newOffer = await this.peerConnection.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: false,
            });
            
            await this.peerConnection.setLocalDescription(newOffer);
            console.log("✅ Nuevo OFFER creado después de cambiar dispositivo");
            
            // Enviar el nuevo OFFER
            this.sendSignalingMessage(SignalingMessageType.OFFER, newOffer);
            console.log("✅ Nuevo OFFER enviado después de cambiar dispositivo");
          } catch (error) {
            console.error("❌ Error al renegociar después de cambiar dispositivo:", error);
          }
        }
      } else if (signalingState === 'have-remote-offer') {
        console.log("⚠️ Cambio de dispositivo durante negociación (have-remote-offer)");
        // Si recibimos el OFFER pero aún no enviamos el ANSWER, el nuevo track se incluirá automáticamente
        // Solo necesitamos crear el ANSWER de nuevo si ya lo habíamos enviado
        if (this.isRemoteDescriptionSet) {
          try {
            const newAnswer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(newAnswer);
            console.log("✅ Nuevo ANSWER creado después de cambiar dispositivo");
            
            this.sendSignalingMessage(SignalingMessageType.ANSWER, newAnswer);
            console.log("✅ Nuevo ANSWER enviado después de cambiar dispositivo");
          } catch (error) {
            console.error("❌ Error al renegociar ANSWER después de cambiar dispositivo:", error);
          }
        }
      } else if (connectionState === 'connected') {
        console.log("✅ Conexión ya establecida, el cambio de track se aplicará automáticamente");
      }
    }

    // Cerrar el stream temporal
    newStream.getTracks().forEach(track => {
      if (!this.localStream!.getTracks().includes(track)) {
        track.stop();
      }
    });

    this.currentDeviceId = deviceId;
    console.log("✅ Dispositivo cambiado a:", device.label);
  }

  /**
   * Cerrar conexión
   */
  public close(): void {
    console.log("🔌 Cerrando chat de voz...");

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    this.pendingIceCandidates = [];
    this.isRemoteDescriptionSet = false;

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
