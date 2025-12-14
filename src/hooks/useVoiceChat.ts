import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { voiceChatService } from "../services/VoiceChatService";
import { webSocketService } from "../services/WebSocketService";
import type { VoiceConnectionState } from "../types/voiceChat";
import { determineInitiator } from "../utils/voiceChat";

interface UseVoiceChatOptions {
  gameId: string;
  localCognitoUsername: string;
  remoteCognitoUsername: string;
  autoStart?: boolean;
}

export const useVoiceChat = (options: UseVoiceChatOptions) => {
  const {
    gameId,
    localCognitoUsername,
    remoteCognitoUsername,
    autoStart = false,
  } = options;

  const { getAccessToken, isAuthenticated } = useAuth();
  const [connectionState, setConnectionState] = useState<VoiceConnectionState>("disconnected");
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  // Determinar iniciador - calcular una sola vez y usar useMemo para evitar recálculos
  const isInitiator = useMemo(() => {
    if (!localCognitoUsername || !remoteCognitoUsername) {
      return false;
    }
    return determineInitiator(localCognitoUsername, remoteCognitoUsername);
  }, [localCognitoUsername, remoteCognitoUsername]);

  /**
   * Iniciar chat de voz
   */
  const startVoiceChat = useCallback(async () => {
    try {
      console.log("🎙️ Iniciando chat de voz con Cognito...");
      setError(null);
      setIsActive(true);

      // Validaciones
      if (!localCognitoUsername || !remoteCognitoUsername) {
        throw new Error("Faltan usernames de Cognito necesarios para el chat de voz");
      }

      // Verificar que sean usernames de Cognito válidos
      if (localCognitoUsername.startsWith('player-') || 
          remoteCognitoUsername.startsWith('player-') ||
          localCognitoUsername.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) ||
          remoteCognitoUsername.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        throw new Error("Los identificadores deben ser usernames de Cognito válidos, no UUIDs ni IDs aleatorios");
      }

      // Verificar WebSocket - reutilizar conexión existente si está disponible
      if (!webSocketService.isWebSocketConnected()) {
        console.warn("⚠️ WebSocket no está conectado. Intentando conectar...");
        
        if (isAuthenticated) {
          try {
            const accessToken = await getAccessToken();
            if (accessToken) {
              console.log("🔐 Token obtenido, conectando WebSocket...");
              // El WebSocketService ya maneja la reutilización de conexiones
              await webSocketService.connect(localCognitoUsername, accessToken);
              console.log("✅ WebSocket conectado con autenticación");
            } else {
              throw new Error("No se pudo obtener el token de autenticación");
            }
          } catch (tokenError) {
            console.error("❌ Error al obtener token o conectar WebSocket:", tokenError);
            throw new Error("No se pudo conectar al servidor. Verifica que estés autenticado y que el backend esté corriendo.");
          }
        } else {
          throw new Error("Debes estar autenticado para usar el chat de voz");
        }
      } else {
        const currentPlayerId = webSocketService.getPlayerId();
        if (currentPlayerId === localCognitoUsername) {
          console.log("✅ WebSocket ya está conectado para este usuario, reutilizando conexión");
        } else {
          console.warn("⚠️ WebSocket conectado pero con diferente usuario, reconectando...");
          await webSocketService.disconnect();
          const accessToken = await getAccessToken();
          await webSocketService.connect(localCognitoUsername, accessToken || undefined);
        }
      }

      await voiceChatService.initialize(
        gameId,
        localCognitoUsername,
        remoteCognitoUsername,
        isInitiator
      );

      console.log("✅ Chat de voz iniciado");
      
      // Actualizar lista de dispositivos
      const devices = voiceChatService.getAvailableDevices();
      const currentDevice = voiceChatService.getCurrentDeviceId();
      setAvailableDevices(devices);
      setCurrentDeviceId(currentDevice);
    } catch (err: any) {
      console.error("❌ Error al iniciar chat de voz:", err);
      const errorMessage = err.message || "No se pudo iniciar el chat de voz. Verifica los permisos del micrófono y tu conexión.";
      setError(errorMessage);
      setIsActive(false);
    }
  }, [gameId, localCognitoUsername, remoteCognitoUsername, isInitiator, isAuthenticated, getAccessToken]);

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
            if (!remoteAudioRef.current) return;
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            if (!remoteAudioRef.current.srcObject) return;
            
            await remoteAudioRef.current.play();
            console.log("✅ Audio remoto reproduciéndose");
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
    if (!remoteAudioRef.current) {
      const audioElement = document.createElement("audio");
      audioElement.autoplay = true;
      audioElement.setAttribute('playsinline', 'true');
      audioElement.volume = 1.0;
      audioElement.muted = false;
      audioElement.style.display = "none";
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

