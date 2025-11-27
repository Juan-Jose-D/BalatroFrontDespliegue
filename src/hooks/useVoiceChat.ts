import { useState, useEffect, useCallback, useRef } from "react";
import { voiceChatService } from "../services/VoiceChatService";
import type { VoiceConnectionState } from "../types/webrtc";

interface UseVoiceChatOptions {
  gameId: string;
  localPlayerId: string;
  remotePlayerId: string;
  isInitiator?: boolean;
  autoStart?: boolean;
}

export const useVoiceChat = (options: UseVoiceChatOptions) => {
  const {
    gameId,
    localPlayerId,
    remotePlayerId,
    isInitiator = false,
    autoStart = false,
  } = options;

  const [connectionState, setConnectionState] = useState<VoiceConnectionState>("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);


  /**
   * Iniciar chat de voz
   */
  const startVoiceChat = useCallback(async () => {
    try {
      console.log("🎙️ Iniciando chat de voz...");
      setError(null);
      setIsActive(true);

      await voiceChatService.initialize(
        gameId,
        localPlayerId,
        remotePlayerId,
        isInitiator
      );

      console.log("✅ Chat de voz iniciado");
      
      // Actualizar lista de dispositivos y dispositivo actual
      const devices = voiceChatService.getAvailableDevices();
      const currentDevice = voiceChatService.getCurrentDeviceId();
      setAvailableDevices(devices);
      setCurrentDeviceId(currentDevice);
    } catch (err) {
      console.error("❌ Error al iniciar chat de voz:", err);
      setError("No se pudo iniciar el chat de voz. Verifica los permisos del micrófono.");
      setIsActive(false);
    }
  }, [gameId, localPlayerId, remotePlayerId, isInitiator]);

  /**
   * Cambiar dispositivo de audio
   */
  const changeDevice = useCallback(async (deviceId: string) => {
    try {
      await voiceChatService.changeDevice(deviceId);
      setCurrentDeviceId(deviceId);
      console.log("✅ Dispositivo cambiado exitosamente");
    } catch (err) {
      console.error("❌ Error al cambiar dispositivo:", err);
      setError(`Error al cambiar dispositivo: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    }
  }, []);

  /**
   * Detener chat de voz
   */
  const stopVoiceChat = useCallback(() => {
    console.log("🛑 Deteniendo chat de voz...");
    voiceChatService.close();
    setIsActive(false);
    setConnectionState("disconnected");
  }, []);

  /**
   * Alternar mute
   */
  const toggleMute = useCallback(() => {
    const newMutedState = voiceChatService.toggleMute();
    setIsMuted(newMutedState);
  }, []);


  /**
   * Configurar callbacks del servicio
   */
  useEffect(() => {
    voiceChatService.onConnectionStateChange((state) => {
      console.log("🔄 Estado de voz:", state);
      setConnectionState(state);

      if (state === "failed" || state === "closed") {
        setIsActive(false);
      }
    });

    voiceChatService.onRemoteStream((stream) => {
      console.log("📻 Stream remoto recibido en hook");
      console.log("📻 Stream info:", {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().length,
        audioTracks: stream.getAudioTracks().length
      });
      
      // Verificar que el stream tenga tracks de audio
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn("⚠️ Stream remoto no tiene tracks de audio");
        return;
      }
      
      // Asegurar que los tracks estén habilitados
      audioTracks.forEach((track, index) => {
        console.log(`📻 Audio track ${index}:`, {
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        });
        
        if (!track.enabled) {
          track.enabled = true;
        }
      });
      
      if (remoteAudioRef.current) {
        if (remoteAudioRef.current.srcObject) {
          const oldStream = remoteAudioRef.current.srcObject as MediaStream;
          oldStream.getTracks().forEach((track) => track.stop());
        }
        
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.volume = 1.0;
        remoteAudioRef.current.muted = false;
        
        const playAudio = async () => {
          try {
            if (!remoteAudioRef.current) {
              console.error("❌ Elemento de audio no disponible");
              return;
            }
            
            // Esperar un momento para que el stream se establezca
            await new Promise(resolve => setTimeout(resolve, 100));
            
            // Verificar que el elemento tenga el stream
            if (!remoteAudioRef.current.srcObject) {
              console.error("❌ Elemento de audio no tiene srcObject");
              return;
            }
            
            // Verificar que el stream tenga tracks activos
            const stream = remoteAudioRef.current.srcObject as MediaStream;
            const audioTracks = stream.getAudioTracks();
            console.log("🔊 Verificando stream antes de reproducir:", {
              streamId: stream.id,
              streamActive: stream.active,
              audioTracks: audioTracks.length,
              tracksEnabled: audioTracks.filter(t => t.enabled).length,
              tracksReady: audioTracks.filter(t => t.readyState === 'live').length
            });
            
            if (audioTracks.length === 0) {
              console.error("❌ Stream no tiene tracks de audio");
              return;
            }
            
            // Intentar reproducir
            await remoteAudioRef.current.play();
            console.log("✅ Audio remoto reproduciéndose");
            console.log("✅ Audio element state:", {
              paused: remoteAudioRef.current.paused,
              readyState: remoteAudioRef.current.readyState,
              volume: remoteAudioRef.current.volume,
              muted: remoteAudioRef.current.muted,
              currentTime: remoteAudioRef.current.currentTime
            });
            
            // Verificar periódicamente que siga reproduciéndose
            const checkPlayback = setInterval(() => {
              if (remoteAudioRef.current) {
                const isPlaying = !remoteAudioRef.current.paused && 
                                 remoteAudioRef.current.currentTime > 0 && 
                                 !remoteAudioRef.current.ended;
                
                if (!isPlaying && remoteAudioRef.current.readyState >= 2) {
                  console.warn("⚠️ Audio pausado, intentando reanudar...");
                  remoteAudioRef.current.play().catch(err => {
                    console.error("❌ Error al reanudar:", err);
                  });
                }
              } else {
                clearInterval(checkPlayback);
              }
            }, 1000);
            
            // Limpiar después de 30 segundos
            setTimeout(() => clearInterval(checkPlayback), 30000);
            
          } catch (err) {
            console.error("❌ Error al reproducir audio remoto:", err);
            const tryPlayAgain = () => {
              if (remoteAudioRef.current) {
                remoteAudioRef.current.play()
                  .then(() => {
                    console.log("✅ Audio remoto reproduciéndose después de retry");
                    document.removeEventListener("click", tryPlayAgain);
                    document.removeEventListener("touchstart", tryPlayAgain);
                  })
                  .catch((err) => {
                    console.error("❌ Error al reintentar reproducción:", err);
                  });
              }
            };
            document.addEventListener("click", tryPlayAgain, { once: true });
            document.addEventListener("touchstart", tryPlayAgain, { once: true });
          }
        };
        
        playAudio();
      } else {
        console.warn("⚠️ Elemento de audio no disponible aún");
      }
    });

    voiceChatService.onError((errorMsg) => {
      console.error("❌ Error de voz:", errorMsg);
      setError(errorMsg);
    });
  }, []);

  /**
   * Auto-iniciar si autoStart está habilitado
   */
  useEffect(() => {
    if (autoStart && !isActive) {
      startVoiceChat();
    }
  }, [autoStart, isActive, startVoiceChat]);

  /**
   * Cleanup al desmontar
   */
  useEffect(() => {
    return () => {
      if (isActive) {
        voiceChatService.close();
      }
    };
  }, [isActive]);

  /**
   * Crear elemento de audio para el stream remoto
   */
  useEffect(() => {
    // Crear elemento de audio inmediatamente
    if (!remoteAudioRef.current) {
      const audioElement = document.createElement("audio");
      audioElement.autoplay = true;
      audioElement.setAttribute('playsinline', 'true');
      audioElement.volume = 1.0;
      audioElement.muted = false;
      audioElement.style.display = "none";
      
      // Agregar listeners para debug
      audioElement.addEventListener('play', () => {
        console.log("🔊 Audio element: play event");
      });
      
      audioElement.addEventListener('playing', () => {
        console.log("🔊 Audio element: playing event");
      });
      
      audioElement.addEventListener('pause', () => {
        console.warn("⚠️ Audio element: pause event");
      });
      
      audioElement.addEventListener('ended', () => {
        console.warn("⚠️ Audio element: ended event");
      });
      
      audioElement.addEventListener('error', (e) => {
        console.error("❌ Audio element error:", e);
      });
      
      audioElement.addEventListener('loadedmetadata', () => {
        console.log("📊 Audio element: metadata loaded");
      });
      
      document.body.appendChild(audioElement);
      remoteAudioRef.current = audioElement;
      console.log("🔊 Elemento de audio creado y agregado al DOM");
    }

    return () => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = null;
        if (remoteAudioRef.current.parentNode) {
          remoteAudioRef.current.parentNode.removeChild(remoteAudioRef.current);
        }
        remoteAudioRef.current = null;
        console.log("🔇 Elemento de audio removido");
      }
    };
  }, []);

  return {
    // Estado
    connectionState,
    isMuted,
    isActive,
    error,
    isConnected: connectionState === "connected",
    availableDevices,
    currentDeviceId,

    // Acciones
    startVoiceChat,
    stopVoiceChat,
    toggleMute,
    changeDevice,
    clearError: () => setError(null),
  };
};
