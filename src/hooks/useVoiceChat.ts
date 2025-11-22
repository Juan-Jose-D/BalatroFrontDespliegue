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
    } catch (err) {
      console.error("❌ Error al iniciar chat de voz:", err);
      setError("No se pudo iniciar el chat de voz. Verifica los permisos del micrófono.");
      setIsActive(false);
    }
  }, [gameId, localPlayerId, remotePlayerId, isInitiator]);

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
    // Callback de cambio de estado de conexión
    voiceChatService.onConnectionStateChange((state) => {
      console.log("🔄 Estado de voz:", state);
      setConnectionState(state);

      if (state === "failed" || state === "closed") {
        setIsActive(false);
      }
    });

    // Callback de stream remoto
    voiceChatService.onRemoteStream((stream) => {
      console.log("📻 Stream remoto recibido en hook");
      console.log("📻 Tracks de audio:", stream.getAudioTracks().length);
      
      // Conectar el stream remoto al elemento de audio
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.volume = 1.0; // Asegurar volumen máximo
        
        // Intentar reproducir
        remoteAudioRef.current.play()
          .then(() => {
            console.log("✅ Audio remoto reproduciéndose correctamente");
          })
          .catch((err) => {
            console.error("❌ Error al reproducir audio remoto:", err);
            // Intentar reproducir de nuevo después de interacción del usuario
            const tryPlayAgain = () => {
              remoteAudioRef.current?.play()
                .then(() => {
                  console.log("✅ Audio remoto reproduciéndose después de retry");
                  document.removeEventListener("click", tryPlayAgain);
                })
                .catch(() => {});
            };
            document.addEventListener("click", tryPlayAgain, { once: true });
          });
      }
    });

    // Callback de error
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
    if (!remoteAudioRef.current) {
      const audioElement = document.createElement("audio");
      audioElement.autoplay = true;
      audioElement.playsInline = true;
      audioElement.volume = 1.0; // Volumen al máximo
      
      // IMPORTANTE: Agregar el elemento al DOM
      audioElement.style.display = "none"; // Oculto pero en el DOM
      document.body.appendChild(audioElement);
      
      remoteAudioRef.current = audioElement;
      
      console.log("🔊 Elemento de audio creado y agregado al DOM");
    }

    return () => {
      if (remoteAudioRef.current) {
        // Limpiar y remover del DOM
        remoteAudioRef.current.srcObject = null;
        if (remoteAudioRef.current.parentNode) {
          remoteAudioRef.current.parentNode.removeChild(remoteAudioRef.current);
        }
        remoteAudioRef.current = null;
        console.log("🔇 Elemento de audio removido del DOM");
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

    // Acciones
    startVoiceChat,
    stopVoiceChat,
    toggleMute,
    clearError: () => setError(null),
  };
};

