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
  
  // Cola de ICE candidates pendientes (para cuando llegan antes de establecer descripción remota)
  private pendingIceCandidates: RTCIceCandidateInit[] = [];
  private isRemoteDescriptionSet: boolean = false;
  
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
      // Simplificar constraints primero para probar
      // Si funciona, podemos agregar más configuraciones después
      console.log("🎤 Solicitando acceso al micrófono con constraints simples...");
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true, // Constraints simples primero para evitar problemas
        video: false,
      });
      
      console.log("✅ Stream obtenido con constraints simples");
      
      // Obtener tracks de audio (se usará más abajo también)
      const audioTracks = this.localStream.getAudioTracks();
      
      // Verificar que el micrófono esté capturando audio real
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        console.log("🎤 Verificando que el micrófono capture audio real...");
        
        // Crear un AudioContext para verificar que hay audio real
        const audioContext = new AudioContext();
        const analyzer = audioContext.createAnalyser();
        analyzer.fftSize = 512;
        analyzer.minDecibels = -100;
        analyzer.maxDecibels = -10;
        
        const source = audioContext.createMediaStreamSource(this.localStream);
        source.connect(analyzer);
        
        const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
        let audioDetected = false;
        
        // Verificar durante 2 segundos
        const checkAudio = setInterval(() => {
          analyzer.getByteFrequencyData(frequencyData);
          const hasAudio = frequencyData.some(val => val > 10); // Umbral mínimo
          
          if (hasAudio && !audioDetected) {
            const maxFreq = Math.max(...Array.from(frequencyData));
            console.log("✅ Micrófono capturando audio real:", {
              maxFrequency: maxFreq,
              nonZeroValues: Array.from(frequencyData).filter(v => v > 0).length
            });
            audioDetected = true;
          }
        }, 100);
        
        setTimeout(() => {
          clearInterval(checkAudio);
          audioContext.close();
          
          if (!audioDetected) {
            console.warn("⚠️ El micrófono no está capturando audio, solo ruido");
            console.warn("⚠️ Verifica que:");
            console.warn("   - El micrófono no esté silenciado en el sistema");
            console.warn("   - Los permisos del navegador estén correctos");
            console.warn("   - Estés hablando cerca del micrófono");
          }
        }, 2000);
      }
      
      // Log de las capacidades del track de audio
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack && audioTrack.getCapabilities) {
        const capabilities = audioTrack.getCapabilities();
        console.log("🎤 Capacidades del micrófono:", capabilities);
      }
      
      if (audioTrack && audioTrack.getSettings) {
        const settings = audioTrack.getSettings();
        console.log("🎤 Configuración del micrófono:", settings);
      }

      console.log("✅ Acceso al micrófono obtenido");
      console.log("🎤 Tracks locales:", this.localStream.getTracks().length);
      
      // Verificar y habilitar tracks de audio (audioTracks ya está declarado arriba)
      console.log("🎤 Tracks de audio encontrados:", audioTracks.length);
      
      if (audioTracks.length === 0) {
        throw new Error("❌ No se encontraron tracks de audio en el stream local!");
      }
      
      audioTracks.forEach((track, index) => {
        console.log(`🎤 Track de audio ${index}:`, {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label,
          kind: track.kind
        });
        
        // Asegurar que el track esté habilitado
        if (!track.enabled) {
          console.warn(`⚠️ Track ${index} está deshabilitado, habilitándolo...`);
          track.enabled = true;
        }
        
        if (track.muted) {
          console.warn(`⚠️ Track ${index} está silenciado!`);
        }
        
        // Verificar configuración del track
        if (track.getSettings) {
          const settings = track.getSettings();
          console.log(`🎤 Configuración del track ${index}:`, settings);
        }
      });

      // Crear peer connection
      this.createPeerConnection();

      // Esperar un momento después de obtener el stream para asegurar que esté listo
      await new Promise(resolve => setTimeout(resolve, 100));

      // Agregar el stream local a la conexión
      console.log("📤 Agregando tracks al peer connection...");
      let tracksAdded = 0;
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          // Verificar que el track esté activo y habilitado antes de agregarlo
          if (track.readyState === 'live' && track.enabled) {
            const sender = this.peerConnection.addTrack(track, this.localStream);
            tracksAdded++;
            console.log(`✅ Track ${track.kind} agregado al peer connection:`, {
              trackId: track.id,
              trackEnabled: track.enabled,
              trackMuted: track.muted,
              trackReadyState: track.readyState,
              senderTrackId: sender.track?.id,
              senderTrackEnabled: sender.track?.enabled
            });
          } else {
            console.warn(`⚠️ Track ${track.kind} no está listo:`, {
              readyState: track.readyState,
              enabled: track.enabled,
              muted: track.muted
            });
            
            // Intentar habilitar el track
            if (!track.enabled) {
              track.enabled = true;
            }
            
            // Esperar un momento y volver a intentar
            setTimeout(() => {
              if (track.readyState === 'live' && this.peerConnection && this.localStream) {
                const sender = this.peerConnection.addTrack(track, this.localStream);
                console.log(`✅ Track ${track.kind} agregado después de esperar:`, {
                  trackId: track.id,
                  senderTrackId: sender.track?.id
                });
              }
            }, 200);
          }
        }
      });
      
      console.log(`✅ Total de tracks agregados: ${tracksAdded}`);
      
      // Verificar que los tracks estén realmente en el peer connection
      if (this.peerConnection) {
        const senders = this.peerConnection.getSenders();
        console.log("📊 Senders en peer connection:", senders.length);
        senders.forEach((sender, index) => {
          if (sender.track) {
            console.log(`📊 Sender ${index}:`, {
              trackId: sender.track.id,
              trackKind: sender.track.kind,
              trackEnabled: sender.track.enabled,
              trackMuted: sender.track.muted,
              trackReadyState: sender.track.readyState
            });
          }
        });
      }

      // Verificar que el WebSocket esté conectado antes de suscribirse
      console.log("🔍 Verificando conexión WebSocket...");
      const isWsConnected = webSocketService.isWebSocketConnected();
      console.log("🔍 WebSocket conectado:", isWsConnected);
      
      if (!isWsConnected) {
        throw new Error("WebSocket no está conectado. Por favor, espera a que la conexión se establezca.");
      }

      // IMPORTANTE: Asegurar que la sesión esté registrada antes de iniciar el chat de voz
      // Esto es crítico para que el backend pueda enrutar mensajes entre jugadores
      console.log("📝 Asegurando registro de sesión antes de iniciar chat de voz...");
      try {
        await webSocketService.registerSession();
        console.log("✅ Sesión registrada correctamente");
      } catch (error) {
        console.warn("⚠️ Error al registrar sesión (puede que ya esté registrada):", error);
        // No fallar aquí, puede que la sesión ya esté registrada
      }

      // Suscribirse a mensajes de señalización
      console.log("📡 Suscribiéndose a:", `/user/queue/webrtc/${gameId}`);
      webSocketService.subscribe(
        `/user/queue/webrtc/${gameId}`,
        this.handleSignalingMessage.bind(this)
      );
      
      // Esperar un momento para asegurar que la suscripción se procese
      await new Promise(resolve => setTimeout(resolve, 300));
      console.log("✅ Suscripción completada");

      // Si es el iniciador, esperar un poco más antes de crear el OFFER
      // Esto da tiempo a que ambos jugadores tengan sus sesiones registradas
      console.log("🔍 isInitiator:", this.isInitiator);
      console.log("🔍 IDs:", {
        localPlayerId: this.localPlayerId,
        remotePlayerId: this.remotePlayerId,
        gameId: this.gameId
      });
      
      // Verificar que tenemos todos los IDs necesarios
      if (!this.localPlayerId || !this.remotePlayerId) {
        console.error("❌ Faltan IDs necesarios para determinar el rol:", {
          hasLocalPlayerId: !!this.localPlayerId,
          hasRemotePlayerId: !!this.remotePlayerId
        });
        throw new Error("Faltan IDs de jugadores para iniciar el chat de voz");
      }
      
      // Mostrar comparación para debug
      const comparison = `${this.localPlayerId} < ${this.remotePlayerId} = ${this.localPlayerId < this.remotePlayerId}`;
      console.log("🔍 Comparación de IDs:", comparison);
      
      if (this.isInitiator) {
        console.log("👑 Este jugador es el INICIADOR");
        console.log("👑 Razón: El ID local es lexicográficamente menor que el ID remoto");
        console.log("👑 Esperando antes de crear OFFER...");
        // Esperar un poco más para asegurar que el otro jugador también esté listo
        // Aumentamos el delay a 1 segundo para dar más tiempo
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log("👑 Creando OFFER...");
        await this.createOffer();
      } else {
        console.log("👥 Este jugador es el RECEPTOR");
        console.log("👥 Razón: El ID local es lexicográficamente mayor que el ID remoto");
        console.log("👥 Esperando OFFER del iniciador...");
        console.log("👥 El otro jugador (ID menor) debe iniciar el chat de voz primero para crear el OFFER");
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
      console.log("🔄 Estado ICE:", this.peerConnection?.iceConnectionState);
      console.log("🔄 Estado de señalización:", this.peerConnection?.signalingState);
      
      if (state) {
        this.updateConnectionState(state as VoiceConnectionState);
      }
      
      // Log detallado cuando la conexión cambia
      if (state === 'connected') {
        console.log("✅ ========== CONEXIÓN ESTABLECIDA ==========");
        console.log("✅ La conexión WebRTC está activa");
        console.log("✅ El stream remoto debería llegar pronto si todo está bien");
      } else if (state === 'failed') {
        console.error("❌ ========== CONEXIÓN FALLIDA ==========");
        console.error("❌ La conexión WebRTC falló");
        console.error("❌ Posibles causas:");
        console.error("   - Los mensajes de señalización no llegaron correctamente (problema de BACKEND)");
        console.error("   - Los ICE candidates no se intercambiaron (problema de BACKEND o red)");
        console.error("   - Problemas de NAT/Firewall (problema de red)");
      } else if (state === 'disconnected') {
        console.warn("⚠️ ========== CONEXIÓN DESCONECTADA ==========");
        console.warn("⚠️ La conexión WebRTC se desconectó");
      }
    };

    // Log del estado ICE (crítico para el stream remoto)
    this.peerConnection.oniceconnectionstatechange = () => {
      const iceState = this.peerConnection?.iceConnectionState;
      console.log("🧊 Estado ICE:", iceState);
      
      if (iceState === 'connected' || iceState === 'completed') {
        console.log("✅ ========== ICE CONECTADO ==========");
        console.log("✅ La conexión ICE está establecida");
        console.log("✅ El stream remoto debería llegar ahora");
      } else if (iceState === 'failed') {
        console.error("❌ ========== ICE FALLIDO ==========");
        console.error("❌ La conexión ICE falló");
        console.error("❌ Esto significa que los peers no pueden conectarse directamente");
        console.error("❌ Posibles causas:");
        console.error("   - Los ICE candidates no se intercambiaron correctamente (BACKEND)");
        console.error("   - Problemas de NAT traversal (red)");
        console.error("   - Firewall bloqueando la conexión (red)");
      } else if (iceState === 'disconnected') {
        console.warn("⚠️ ICE desconectado - la conexión se perdió");
      }
    };

    // Log de estado de gathering
    this.peerConnection.onicegatheringstatechange = () => {
      const gatheringState = this.peerConnection?.iceGatheringState;
      console.log("🧊 Estado de gathering:", gatheringState);
    };

    // Manejar stream remoto
    this.peerConnection.ontrack = (event) => {
      console.log("📻 ========== STREAM REMOTO RECIBIDO ==========");
      console.log("📻 Track recibido:", event.track.kind, "- Enabled:", event.track.enabled);
      console.log("📻 Streams en el evento:", event.streams.length);
      console.log("📻 Estado de la conexión:", {
        connectionState: this.peerConnection?.connectionState,
        iceConnectionState: this.peerConnection?.iceConnectionState,
        signalingState: this.peerConnection?.signalingState
      });
      
      // Asegurarse de que tenemos un stream válido
      if (event.streams && event.streams.length > 0) {
        this.remoteStream = event.streams[0];
        console.log("📻 Stream remoto obtenido del array de streams");
      } else if (event.track) {
        // Si no hay streams pero hay un track, crear un nuevo stream
        this.remoteStream = new MediaStream([event.track]);
        console.log("📻 Stream creado desde track individual");
      } else {
        console.error("❌ No se pudo obtener stream remoto del evento");
        console.error("❌ Evento completo:", event);
        return;
      }
      
      // Log de los tracks de audio
      const audioTracks = this.remoteStream.getAudioTracks();
      console.log("📻 Audio tracks en stream remoto:", audioTracks.length);
      
      if (audioTracks.length === 0) {
        console.warn("⚠️ No se encontraron tracks de audio en el stream remoto");
        console.warn("⚠️ Todos los tracks del stream:", this.remoteStream.getTracks().map(t => ({
          kind: t.kind,
          enabled: t.enabled,
          readyState: t.readyState
        })));
      }
      
      audioTracks.forEach((track, index) => {
        console.log(`📻 Audio track ${index}:`, {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label,
          settings: track.getSettings()
        });
        
        // Asegurarse de que el track esté habilitado
        if (!track.enabled) {
          console.warn(`⚠️ Audio track ${index} está deshabilitado, habilitándolo...`);
          track.enabled = true;
        }
        
        // Escuchar cambios en el estado del track
        track.onended = () => {
          console.warn(`⚠️ Audio track ${index} terminó`);
        };
        
        track.onmute = () => {
          console.warn(`⚠️ Audio track ${index} fue silenciado`);
        };
        
        track.onunmute = () => {
          console.log(`✅ Audio track ${index} fue des-silenciado`);
        };
      });
      
      // Asegurarse de que el stream tenga tracks activos antes de llamar al callback
      if (audioTracks.length > 0 && this.onRemoteStreamCallback) {
        console.log("✅ Stream remoto válido con tracks de audio");
        console.log("✅ Llamando callback de stream remoto");
        this.onRemoteStreamCallback(this.remoteStream);
        console.log("✅ Callback de stream remoto ejecutado");
      } else {
        console.warn("⚠️ No se puede notificar stream remoto: sin tracks de audio");
        console.warn("⚠️ Estado:", {
          hasAudioTracks: audioTracks.length > 0,
          hasCallback: !!this.onRemoteStreamCallback
        });
      }
      
      console.log("📻 ============================================");
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
      console.log("📤 Estado del peer connection:", {
        connectionState: this.peerConnection.connectionState,
        iceConnectionState: this.peerConnection.iceConnectionState,
        signalingState: this.peerConnection.signalingState,
        localDescription: this.peerConnection.localDescription?.type,
        remoteDescription: this.peerConnection.remoteDescription?.type
      });
      
      // Verificar que haya tracks en el peer connection antes de crear el offer
      const senders = this.peerConnection.getSenders();
      console.log("📤 Senders en peer connection antes de crear offer:", senders.length);
      senders.forEach((sender, index) => {
        if (sender.track) {
          console.log(`📤 Sender ${index}:`, {
            trackId: sender.track.id,
            trackKind: sender.track.kind,
            trackEnabled: sender.track.enabled,
            trackMuted: sender.track.muted,
            trackReadyState: sender.track.readyState
          });
        } else {
          console.warn(`⚠️ Sender ${index} no tiene track!`);
        }
      });
      
      // Crear offer con opciones específicas para audio
      const offer = await this.peerConnection.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      
      // Verificar que el SDP incluya audio
      if (offer.sdp) {
        const hasAudio = offer.sdp.includes('m=audio');
        const hasOpus = offer.sdp.includes('opus');
        const audioLines = offer.sdp.split('\n').filter(line => 
          line.includes('m=audio') || 
          line.includes('opus') || 
          line.includes('rtpmap:111') // Opus codec
        );
        
        console.log("📤 SDP del OFFER:", {
          hasAudio,
          hasOpus,
          sdpLength: offer.sdp.length,
          audioLinesCount: audioLines.length,
          audioLines: audioLines.slice(0, 10) // Primeras 10 líneas relacionadas con audio
        });
        
        if (!hasAudio) {
          console.error("❌ El SDP no incluye audio!");
          console.error("❌ Esto significa que no hay tracks de audio en el peer connection");
        } else if (!hasOpus) {
          console.warn("⚠️ El SDP incluye audio pero no codec Opus");
        } else {
          console.log("✅ SDP incluye audio con codec Opus");
        }
      }
      
      console.log("📤 Offer creado:", {
        type: offer.type,
        sdpPreview: offer.sdp ? `${offer.sdp.substring(0, 200)}...` : 'sin SDP'
      });
      
      await this.peerConnection.setLocalDescription(offer);
      console.log("✅ Local description establecida (offer)");
      
      console.log("📤 Enviando OFFER a:", {
        targetId: this.remotePlayerId,
        gameId: this.gameId
      });
      
      this.sendSignalingMessage(SignalingMessageType.OFFER, offer);
      console.log("✅ Offer enviado exitosamente");
    } catch (error) {
      console.error("❌ Error al crear offer:", error);
      if (this.onErrorCallback) {
        this.onErrorCallback(`Error al iniciar la conexión de voz: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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
      // Crear answer con opciones específicas para audio
      const answer = await this.peerConnection.createAnswer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      
      await this.peerConnection.setLocalDescription(answer);
      console.log("✅ Local description establecida (answer)");
      
      // Procesar ICE candidates pendientes después de establecer la descripción local
      await this.processPendingIceCandidates();
      
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
        console.log("✅ ICE candidate pendiente agregado");
      } catch (error) {
        console.error("❌ Error al agregar ICE candidate pendiente:", error);
      }
    }
    
    this.pendingIceCandidates = [];
  }

  /**
   * Manejar mensajes de señalización
   */
  private async handleSignalingMessage(message: any): Promise<void> {
    try {
      console.log("📨 ========== MENSAJE DE SEÑALIZACIÓN RECIBIDO ==========");
      console.log("📨 Mensaje de señalización recibido - RAW:", message);
      console.log("📨 Tipo de mensaje:", message.type);
      console.log("📨 Payload:", message.payload);
      
      const signalingMsg = message.payload as SignalingMessage;
      console.log("📨 SignalingMessage procesado:", signalingMsg);
      console.log("📨 De:", signalingMsg.senderId, "Para:", signalingMsg.targetId);
      console.log("📨 Este jugador (local):", this.localPlayerId);
      console.log("📨 ¿Es para este jugador?:", signalingMsg.targetId === this.localPlayerId);

      if (!this.peerConnection) {
        console.error("❌ No hay peer connection para procesar mensaje");
        console.error("❌ Esto puede ocurrir si el chat de voz no se ha inicializado correctamente");
        return;
      }

      if (!signalingMsg || !signalingMsg.type) {
        console.error("❌ Mensaje de señalización inválido:", signalingMsg);
        return;
      }

      // Verificar que el mensaje sea para este jugador
      if (signalingMsg.targetId !== this.localPlayerId) {
        console.warn("⚠️ Mensaje de señalización no es para este jugador:", {
          targetId: signalingMsg.targetId,
          localPlayerId: this.localPlayerId
        });
        return;
      }

      console.log("📨 Switch case - tipo:", signalingMsg.type);
      console.log("📨 Estado del peer connection:", {
        connectionState: this.peerConnection.connectionState,
        signalingState: this.peerConnection.signalingState,
        iceConnectionState: this.peerConnection.iceConnectionState
      });
      
      switch (signalingMsg.type) {
        case SignalingMessageType.OFFER:
          console.log("📥 Procesando OFFER...");
          console.log("📥 Este jugador es el RECEPTOR - Recibiendo OFFER del iniciador");
          try {
            const offer = signalingMsg.payload as RTCSessionDescriptionInit;
            if (!offer || !offer.sdp) {
              throw new Error("Offer inválido: falta SDP");
            }
            
            console.log("📥 Offer recibido:", {
              type: offer.type,
              sdpLength: offer.sdp?.length || 0,
              sdpPreview: offer.sdp ? `${offer.sdp.substring(0, 100)}...` : 'sin SDP'
            });
            
            await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription(offer)
            );
            this.isRemoteDescriptionSet = true;
            console.log("✅ Remote description establecida (OFFER)");
            
            // Procesar ICE candidates pendientes
            await this.processPendingIceCandidates();
            
            console.log("📤 Creando ANSWER en respuesta al OFFER...");
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
          console.log("📥 Este jugador es el INICIADOR - Recibiendo ANSWER del receptor");
          try {
            const answer = signalingMsg.payload as RTCSessionDescriptionInit;
            if (!answer || !answer.sdp) {
              throw new Error("Answer inválido: falta SDP");
            }
            
            console.log("📥 Answer recibido:", {
              type: answer.type,
              sdpLength: answer.sdp?.length || 0,
              sdpPreview: answer.sdp ? `${answer.sdp.substring(0, 100)}...` : 'sin SDP'
            });
            
            await this.peerConnection.setRemoteDescription(
              new RTCSessionDescription(answer)
            );
            this.isRemoteDescriptionSet = true;
            console.log("✅ Remote description establecida (ANSWER)");
            
            // Procesar ICE candidates pendientes
            await this.processPendingIceCandidates();
            console.log("✅ ANSWER procesado correctamente, conexión debería establecerse pronto");
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

            // Si la descripción remota aún no está establecida, guardar en cola
            if (!this.isRemoteDescriptionSet) {
              console.log("⏳ Guardando ICE candidate en cola (descripción remota no establecida aún)");
              this.pendingIceCandidates.push(candidate);
              return;
            }

            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("✅ ICE candidate agregado");
          } catch (error) {
            console.error("❌ Error al procesar ICE_CANDIDATE:", error);
            // No es crítico, algunos ICE candidates pueden fallar
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
      console.error("❌ Faltan datos para enviar mensaje de señalización", {
        gameId: this.gameId,
        localPlayerId: this.localPlayerId,
        remotePlayerId: this.remotePlayerId
      });
      return;
    }

    // Verificar que el WebSocket esté conectado antes de enviar
    if (!webSocketService.isWebSocketConnected()) {
      console.error("❌ WebSocket no está conectado, no se puede enviar mensaje de señalización");
      if (this.onErrorCallback) {
        this.onErrorCallback("WebSocket no está conectado. Por favor, reconecta.");
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

    console.log(`📤 ========== ENVIANDO MENSAJE DE SEÑALIZACIÓN ==========`);
    console.log(`📤 Tipo: ${type}`);
    console.log(`📤 De (senderId): ${this.localPlayerId}`);
    console.log(`📤 Para (targetId): ${this.remotePlayerId}`);
    console.log(`📤 GameId: ${this.gameId}`);
    console.log(`📤 Payload type: ${payload.type || 'ICE_CANDIDATE'}`);
    console.log(`📤 Mensaje completo:`, JSON.stringify(message, null, 2));
    console.log(`📤 =====================================================`);
    
    try {
      webSocketService.send("/app/webrtc/signal", message);
      console.log(`✅ Mensaje de señalización enviado: ${type}`);
      console.log(`✅ El backend debería enrutar este mensaje a: ${this.remotePlayerId}`);
      console.log(`✅ Si el receptor no lo recibe, el problema está en el BACKEND (no encuentra la sesión)`);
      
      // Nota: Si el backend no encuentra la sesión del jugador objetivo,
      // el mensaje se perderá. El backend debería manejar esto mejor,
      // pero desde el frontend solo podemos asegurar que nuestra sesión esté registrada.
    } catch (error) {
      console.error(`❌ Error al enviar mensaje de señalización ${type}:`, error);
      if (this.onErrorCallback && type === SignalingMessageType.OFFER) {
        // Solo mostrar error para OFFER, ya que es crítico
        this.onErrorCallback(`Error al enviar ${type}. Verifica que ambos jugadores estén conectados.`);
      }
    }
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
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
      this.remoteStream = null;
    }

    // Limpiar cola de ICE candidates
    this.pendingIceCandidates = [];
    this.isRemoteDescriptionSet = false;

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

