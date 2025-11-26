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
  const [audioLevel, setAudioLevel] = useState(0);

  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const localAnalyzerRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const localAnimationFrameRef = useRef<number | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
  const processedStreamRef = useRef<MediaStream | null>(null);
  const audioLevelRef = useRef<number>(0); // Para rastrear cambios en el nivel de audio
  const frameCountRef = useRef<number>(0); // Para contar frames y loguear periódicamente

  /**
   * Crear AudioContext compartido y aplicar filtros de audio
   */
  const createProcessedAudioStream = useCallback((stream: MediaStream): MediaStream => {
    try {
      // Crear o reutilizar AudioContext
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext({
          sampleRate: 48000,
          latencyHint: 'interactive'
        });
      }

      const audioContext = audioContextRef.current;
      
      // Si el contexto está suspendido, reanudarlo
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      // Crear fuente desde el stream
      const source = audioContext.createMediaStreamSource(stream);
      
      // Crear destino para el stream procesado
      if (!audioDestinationRef.current) {
        audioDestinationRef.current = audioContext.createMediaStreamDestination();
      }
      const destination = audioDestinationRef.current;

      // Crear filtro de paso bajo para reducir frecuencias altas (ruido de estática)
      const lowpassFilter = audioContext.createBiquadFilter();
      lowpassFilter.type = 'lowpass';
      lowpassFilter.frequency.value = 8000; // Cortar frecuencias por encima de 8kHz
      lowpassFilter.Q.value = 1;

      // Crear filtro de paso alto para reducir ruido de baja frecuencia
      const highpassFilter = audioContext.createBiquadFilter();
      highpassFilter.type = 'highpass';
      highpassFilter.frequency.value = 80; // Cortar frecuencias por debajo de 80Hz
      highpassFilter.Q.value = 1;

      // Crear compresor dinámico para suavizar el audio
      const compressor = audioContext.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 30;
      compressor.ratio.value = 12;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.25;

      // Crear nodo de ganancia para aumentar el volumen del audio
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 2.0; // Aumentar el volumen al doble (200%)

      // Conectar: fuente -> highpass -> lowpass -> compressor -> gain -> destino
      source.connect(highpassFilter);
      highpassFilter.connect(lowpassFilter);
      lowpassFilter.connect(compressor);
      compressor.connect(gainNode);
      gainNode.connect(destination);

      // Crear analyzer para monitoreo
      const analyzer = audioContext.createAnalyser();
      compressor.connect(analyzer);
      
      // Configurar el analyzer para mejor detección de audio
      analyzer.fftSize = 512;
      analyzer.smoothingTimeConstant = 0.8;
      analyzer.minDecibels = -90;
      analyzer.maxDecibels = -10;
      
      analyzerRef.current = analyzer;

      console.log("🔊 Stream de audio procesado creado con filtros de reducción de ruido");
      return destination.stream;
    } catch (err) {
      console.error("❌ Error al crear stream procesado, usando stream original:", err);
      return stream;
    }
  }, []);

  /**
   * Monitorear nivel de audio del stream remoto
   */
  const monitorAudioLevel = useCallback((stream: MediaStream) => {
    try {
      // Limpiar el monitor anterior si existe
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // IMPORTANTE: Usar el stream ORIGINAL para análisis, no el procesado
      // El stream procesado puede estar filtrando las frecuencias de voz
      // El stream original tiene el audio real sin filtros
      const streamToAnalyze = stream;
      
      console.log("🎵 Iniciando monitoreo con stream:", {
        streamId: streamToAnalyze.id,
        streamActive: streamToAnalyze.active,
        trackCount: streamToAnalyze.getTracks().length,
        audioTrackCount: streamToAnalyze.getAudioTracks().length,
        isProcessed: !!processedStreamRef.current && processedStreamRef.current.id === streamToAnalyze.id
      });

      // Crear o reutilizar AudioContext
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext({
          sampleRate: 48000,
          latencyHint: 'interactive'
        });
      }

      const audioContext = audioContextRef.current;
      
      // Si el contexto está suspendido, reanudarlo
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const analyzer = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(streamToAnalyze);
      
      // Configurar el analyzer para mejor detección de audio
      analyzer.fftSize = 512;
      analyzer.smoothingTimeConstant = 0.3; // Reducir suavizado para mejor detección
      analyzer.minDecibels = -100; // Más sensible
      analyzer.maxDecibels = -10;
      
      source.connect(analyzer);
      
      analyzerRef.current = analyzer;
      
      console.log("🎵 Analyzer configurado:", {
        fftSize: analyzer.fftSize,
        frequencyBinCount: analyzer.frequencyBinCount,
        smoothingTimeConstant: analyzer.smoothingTimeConstant,
        minDecibels: analyzer.minDecibels,
        maxDecibels: analyzer.maxDecibels,
        streamTracks: streamToAnalyze.getTracks().length,
        streamActive: streamToAnalyze.active,
        audioContextState: audioContext.state,
        audioContextSampleRate: audioContext.sampleRate
      });
      
      const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
      const timeData = new Uint8Array(analyzer.fftSize);
      
      const checkLevel = () => {
        if (analyzerRef.current) {
          // Incrementar contador de frames
          const frameCount = (frameCountRef.current || 0) + 1;
          frameCountRef.current = frameCount;
          
          // Usar datos de frecuencia para detectar audio
          analyzer.getByteFrequencyData(frequencyData);
          
          // También usar datos de tiempo para verificar si hay señal
          analyzer.getByteTimeDomainData(timeData);
          
          // Verificar en la primera lectura que el analyzer esté funcionando
          if (frameCount === 1) {
            console.log("🔍 Primera lectura del analyzer REMOTO:", {
              frequencyDataLength: frequencyData.length,
              timeDataLength: timeData.length,
              frequencyDataFirst10: Array.from(frequencyData).slice(0, 10),
              timeDataFirst10: Array.from(timeData).slice(0, 10),
              frequencyDataMin: Math.min(...Array.from(frequencyData)),
              frequencyDataMax: Math.max(...Array.from(frequencyData)),
              timeDataMin: Math.min(...Array.from(timeData)),
              timeDataMax: Math.max(...Array.from(timeData)),
              analyzerConnected: !!analyzerRef.current,
              streamActive: streamToAnalyze.active,
              streamTracks: streamToAnalyze.getTracks().length,
              streamAudioTracks: streamToAnalyze.getAudioTracks().length
            });
          }
          
          // Verificar que los datos no estén todos en cero
          const hasFrequencyData = frequencyData.some(val => val > 0);
          const hasTimeData = timeData.some(val => val !== 128); // 128 es el valor neutral
          
          if (!hasFrequencyData && !hasTimeData) {
            // No hay datos de audio, nivel es 0
            setAudioLevel(0);
            animationFrameRef.current = requestAnimationFrame(checkLevel);
            return;
          }
          
          // Calcular el promedio de frecuencia
          const frequencyAverage = frequencyData.reduce((a, b) => a + b) / frequencyData.length;
          
          // Calcular el volumen RMS (Root Mean Square) del dominio del tiempo
          let sumSquares = 0;
          let sampleCount = 0;
          for (let i = 0; i < timeData.length; i++) {
            const normalized = (timeData[i] - 128) / 128;
            sumSquares += normalized * normalized;
            if (Math.abs(normalized) > 0.01) sampleCount++; // Contar muestras con señal
          }
          const rms = Math.sqrt(sumSquares / timeData.length);
          
          // Calcular el pico de frecuencia (más sensible para voz)
          const maxFrequency = Math.max(...Array.from(frequencyData));
          
          // Log de diagnóstico cada 300 frames para ver los valores reales
          if (frameCount % 300 === 0) {
            const nonZeroFreq = Array.from(frequencyData).filter(v => v > 0);
            const timeDataNonNeutral = Array.from(timeData).filter(v => v !== 128);
            
            console.log("🔍 Diagnóstico de frequencyData:", {
              totalValues: frequencyData.length,
              nonZeroValues: nonZeroFreq.length,
              maxValue: maxFrequency,
              minNonZero: nonZeroFreq.length > 0 ? Math.min(...nonZeroFreq) : 0,
              maxNonZero: nonZeroFreq.length > 0 ? Math.max(...nonZeroFreq) : 0,
              first10Values: Array.from(frequencyData).slice(0, 10),
              voiceRangeValues: Array.from(frequencyData).slice(2, 8),
              timeDataNonNeutral: timeDataNonNeutral.length,
              timeDataFirst10: Array.from(timeData).slice(0, 10),
              timeDataMin: Math.min(...Array.from(timeData)),
              timeDataMax: Math.max(...Array.from(timeData)),
              streamId: streamToAnalyze.id,
              streamActive: streamToAnalyze.active,
              tracks: streamToAnalyze.getTracks().map(t => ({
                enabled: t.enabled,
                muted: t.muted,
                readyState: t.readyState
              })),
              isProcessedStream: !!processedStreamRef.current && processedStreamRef.current.id === streamToAnalyze.id,
              audioContextState: audioContext.state
            });
            
            // Advertencia si no hay frecuencias pero sí hay datos de tiempo
            if (nonZeroFreq.length === 0 && timeDataNonNeutral.length > 0) {
              console.warn("⚠️ PROBLEMA DETECTADO: Hay datos de tiempo pero NO hay frecuencias detectadas. Esto puede indicar:");
              console.warn("   1. El stream solo tiene ruido/estática (no voz)");
              console.warn("   2. El analyzer no está funcionando correctamente");
              console.warn("   3. El stream remoto no tiene audio real");
            }
          }
          
          // Calcular el promedio de las frecuencias más altas (donde está la voz humana)
          // La voz humana está típicamente entre 85-255 Hz (índices ~2-7 en frequencyData)
          const voiceRange = frequencyData.slice(2, 8);
          const voiceAverage = voiceRange.length > 0 
            ? voiceRange.reduce((a, b) => a + b) / voiceRange.length 
            : 0;
          
          // Calcular el promedio de frecuencias medias-altas (más sensible)
          const midHighRange = frequencyData.slice(1, 16);
          const midHighAverage = midHighRange.length > 0
            ? midHighRange.reduce((a, b) => a + b) / midHighRange.length
            : 0;
          
          // Usar múltiples métodos y tomar el máximo
          // Amplificar significativamente para detectar audio bajo
          const rmsLevel = Math.min(100, Math.round(rms * 3000)); // Más amplificación
          const frequencyLevel = Math.min(100, Math.round(frequencyAverage * 4));
          const maxFreqLevel = Math.min(100, Math.round(maxFrequency * 0.8));
          const voiceLevel = Math.min(100, Math.round(voiceAverage * 3));
          const midHighLevel = Math.min(100, Math.round(midHighAverage * 2));
          
          // Tomar el máximo de todos los métodos
          const level = Math.max(rmsLevel, frequencyLevel, maxFreqLevel, voiceLevel, midHighLevel);
          
          // Guardar el nivel anterior para detectar cambios
          const previousLevel = audioLevelRef.current || 0;
          audioLevelRef.current = level;
          
          setAudioLevel(level);
          
          // Log cuando hay cambios significativos en el nivel (más de 3 puntos) o periódicamente
          const levelChange = Math.abs(level - previousLevel);
          // Log si: hay cambio significativo (>3), nivel alto (>5), o aleatoriamente (30% de probabilidad)
          // También loguear cada 60 frames aproximadamente (1 vez por segundo) para diagnóstico
          const shouldLog = levelChange > 3 || level > 5 || (Math.random() < 0.3) || (frameCount % 60 === 0);
          
          if (shouldLog) {
            console.log("🎵 Nivel de audio remoto:", {
              level,
              previousLevel,
              levelChange,
              rmsLevel,
              frequencyLevel,
              maxFreqLevel,
              voiceLevel,
              midHighLevel,
              frequencyAverage: Math.round(frequencyAverage),
              maxFrequency,
              midHighAverage: Math.round(midHighAverage),
              voiceAverage: Math.round(voiceAverage),
              rms: rms.toFixed(4),
              sampleCount,
              hasFrequencyData,
              hasTimeData,
              frameCount
            });
          }
          
          // Log de advertencia si hay datos pero el nivel es muy bajo (cada 120 frames)
          if (hasFrequencyData && hasTimeData && level === 0 && frameCount % 120 === 0) {
            console.warn("⚠️ Hay datos de audio pero el nivel calculado es 0:", {
              frequencyAverage,
              maxFrequency,
              rms,
              sampleCount,
              hasFrequencyData,
              hasTimeData,
              streamActive: streamToAnalyze.active,
              trackCount: streamToAnalyze.getTracks().length,
              audioTrackCount: streamToAnalyze.getAudioTracks().length
            });
          }
          
          // Log de diagnóstico si no hay datos de audio (cada 180 frames)
          if (!hasFrequencyData && !hasTimeData && frameCount % 180 === 0) {
            console.warn("⚠️ No hay datos de audio detectados:", {
              streamActive: streamToAnalyze.active,
              trackCount: streamToAnalyze.getTracks().length,
              audioTrackCount: streamToAnalyze.getAudioTracks().length,
              tracks: streamToAnalyze.getAudioTracks().map(t => ({
                enabled: t.enabled,
                muted: t.muted,
                readyState: t.readyState
              })),
              audioContextState: audioContext.state
            });
          }
          
          animationFrameRef.current = requestAnimationFrame(checkLevel);
        }
      };
      
      checkLevel();
      console.log("🎵 Monitor de nivel de audio remoto iniciado");
      console.log("🎵 Configuración del analyzer:", {
        fftSize: analyzer.fftSize,
        frequencyBinCount: analyzer.frequencyBinCount,
        smoothingTimeConstant: analyzer.smoothingTimeConstant,
        minDecibels: analyzer.minDecibels,
        maxDecibels: analyzer.maxDecibels
      });
      console.log("🎵 Stream analizado:", {
        id: stream.id,
        active: stream.active,
        trackCount: stream.getTracks().length,
        audioTrackCount: stream.getAudioTracks().length
      });
    } catch (err) {
      console.error("❌ Error al monitorear nivel de audio:", err);
    }
  }, []);

  /**
   * Monitorear nivel de audio del stream local
   */
  const monitorLocalAudioLevel = useCallback(() => {
    try {
      // Limpiar el monitor anterior si existe
      if (localAnimationFrameRef.current) {
        cancelAnimationFrame(localAnimationFrameRef.current);
      }

      const localStream = voiceChatService.getLocalStream();
      if (!localStream) {
        console.warn("⚠️ No hay stream local para monitorear");
        return;
      }

      // Verificar que el stream tenga tracks de audio
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.error("❌ Stream local no tiene tracks de audio!");
        return;
      }

      console.log("🎤 Monitoreando stream local:", {
        streamId: localStream.id,
        streamActive: localStream.active,
        audioTrackCount: audioTracks.length,
        tracks: audioTracks.map(t => ({
          id: t.id,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
          label: t.label
        }))
      });

      const audioContext = new AudioContext();
      const analyzer = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(localStream);
      
      // Configurar el analyzer
      analyzer.fftSize = 512;
      analyzer.smoothingTimeConstant = 0.3; // Menos suavizado para mejor detección
      analyzer.minDecibels = -100; // Más sensible
      analyzer.maxDecibels = -10;
      
      source.connect(analyzer);
      
      localAnalyzerRef.current = analyzer;
      
      const frequencyData = new Uint8Array(analyzer.frequencyBinCount);
      const timeData = new Uint8Array(analyzer.fftSize);
      let frameCount = 0;
      
      const checkLevel = () => {
        if (localAnalyzerRef.current) {
          frameCount++;
          analyzer.getByteFrequencyData(frequencyData);
          analyzer.getByteTimeDomainData(timeData);
          
          // Verificar en la primera lectura
          if (frameCount === 1) {
            console.log("🔍 Primera lectura del analyzer LOCAL:", {
              frequencyDataLength: frequencyData.length,
              timeDataLength: timeData.length,
              frequencyDataFirst10: Array.from(frequencyData).slice(0, 10),
              timeDataFirst10: Array.from(timeData).slice(0, 10),
              analyzerConnected: !!localAnalyzerRef.current,
              streamActive: localStream.active,
              streamTracks: localStream.getTracks().length
            });
          }
          
          const frequencyAverage = frequencyData.reduce((a, b) => a + b) / frequencyData.length;
          const maxFrequency = Math.max(...Array.from(frequencyData));
          
          let sumSquares = 0;
          for (let i = 0; i < timeData.length; i++) {
            const normalized = (timeData[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / timeData.length);
          const volume = Math.min(100, Math.round(rms * 3000));
          
          const level = Math.max(frequencyAverage * 4, volume);
          
          // Log cada 300 frames para verificar que el micrófono esté capturando
          if (frameCount % 300 === 0) {
            const nonZeroFreq = Array.from(frequencyData).filter(v => v > 0);
            const timeDataRange = {
              min: Math.min(...Array.from(timeData)),
              max: Math.max(...Array.from(timeData)),
              avg: Math.round(Array.from(timeData).reduce((a, b) => a + b) / timeData.length)
            };
            
            console.log("🎤 Diagnóstico de audio LOCAL:", {
              level: Math.min(100, Math.round(level)),
              frequencyAverage: Math.round(frequencyAverage),
              maxFrequency,
              nonZeroFreqCount: nonZeroFreq.length,
              rms: rms.toFixed(4),
              volume,
              hasFrequencyData: nonZeroFreq.length > 0,
              tracksEnabled: audioTracks.every(t => t.enabled),
              tracksMuted: audioTracks.some(t => t.muted),
              timeDataRange
            });
            
            // Advertencia si no hay frecuencias detectadas pero hay datos de tiempo
            if (nonZeroFreq.length === 0 && rms > 0.001) {
              console.warn("⚠️ PROBLEMA CRÍTICO: Hay datos de tiempo pero NO hay frecuencias detectadas en el stream LOCAL!");
              console.warn("   - Esto indica que el analyzer no está funcionando correctamente");
              console.warn("   - O que el stream solo tiene ruido/estática muy baja (no voz)");
              console.warn("   - Verifica que estés hablando cerca del micrófono");
              console.warn("   - Verifica que el micrófono no esté silenciado en el sistema");
            } else if (nonZeroFreq.length === 0 && rms < 0.001) {
              console.warn("⚠️ PROBLEMA: El micrófono local NO está capturando audio!");
              console.warn("   - Verifica que el micrófono no esté silenciado");
              console.warn("   - Verifica los permisos del navegador");
              console.warn("   - Habla más fuerte o más cerca del micrófono");
            }
          }
          
          localAnimationFrameRef.current = requestAnimationFrame(checkLevel);
        }
      };
      
      checkLevel();
      console.log("🎤 Monitor de nivel de audio local iniciado");
    } catch (err) {
      console.error("❌ Error al monitorear nivel de audio local:", err);
    }
  }, []);

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
      
      // Verificar que el stream tenga tracks de audio
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn("⚠️ Stream remoto recibido sin tracks de audio");
        return;
      }
      
      console.log("📻 Información detallada del stream remoto:", {
        trackCount: audioTracks.length,
        tracks: audioTracks.map(track => ({
          id: track.id,
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label,
          kind: track.kind
        }))
      });
      
      // Asegurarse de que los tracks estén habilitados
      audioTracks.forEach((track, index) => {
        console.log(`📻 Track ${index} antes de habilitar:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        });
        
        if (!track.enabled) {
          console.log(`🔧 Habilitando track de audio remoto ${index}`);
          track.enabled = true;
        }
        
        if (track.muted) {
          console.warn(`⚠️ Track ${index} está silenciado, intentando des-silenciar`);
          // No podemos des-silenciar directamente, pero podemos verificar
        }
        
        console.log(`📻 Track ${index} después de habilitar:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState
        });
      });
      
      // Procesar el stream con filtros de audio para reducir ruido
      const processedStream = createProcessedAudioStream(stream);
      processedStreamRef.current = processedStream;
      
      console.log("🔊 Stream procesado creado:", {
        originalStreamId: stream.id,
        processedStreamId: processedStream.id,
        originalTracks: stream.getTracks().length,
        processedTracks: processedStream.getTracks().length,
        originalActive: stream.active,
        processedActive: processedStream.active,
        originalAudioTracks: stream.getAudioTracks().length,
        processedAudioTracks: processedStream.getAudioTracks().length
      });
      
      // Resetear el contador de frames cuando se inicia un nuevo stream
      frameCountRef.current = 0;
      
      // Monitorear el nivel de audio del stream remoto (usará el procesado si está disponible)
      monitorAudioLevel(stream);
      
      // Monitorear el nivel de audio local también
      monitorLocalAudioLevel();
      
      // Conectar el stream procesado al elemento de audio
      if (remoteAudioRef.current) {
        // Detener el stream anterior si existe
        if (remoteAudioRef.current.srcObject) {
          const oldStream = remoteAudioRef.current.srcObject as MediaStream;
          oldStream.getTracks().forEach((track) => track.stop());
        }
        
        // Usar el stream ORIGINAL para reproducción (el procesado solo se usa para análisis)
        // El stream procesado puede no tener los tracks correctamente conectados
        remoteAudioRef.current.srcObject = stream;
        remoteAudioRef.current.volume = 1.0; // Volumen máximo del elemento
        remoteAudioRef.current.muted = false;
        
        // Escuchar eventos del elemento de audio
        remoteAudioRef.current.onplay = () => {
          console.log("✅ Audio remoto empezó a reproducirse");
        };
        
        remoteAudioRef.current.onpause = () => {
          console.warn("⚠️ Audio remoto pausado");
        };
        
        remoteAudioRef.current.onerror = (err) => {
          console.error("❌ Error en elemento de audio remoto:", err);
        };
        
        // Verificar el estado del stream antes de reproducir
        console.log("📻 Estado del stream remoto antes de reproducir:", {
          trackCount: stream.getTracks().length,
          audioTrackCount: stream.getAudioTracks().length,
          tracks: stream.getTracks().map(t => ({
            kind: t.kind,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState
          }))
        });
        
        // Intentar reproducir inmediatamente
        const playAudio = async () => {
          try {
            if (remoteAudioRef.current) {
              // Verificar que el elemento tenga el stream
              if (!remoteAudioRef.current.srcObject) {
                console.error("❌ El elemento de audio no tiene srcObject");
                return;
              }
              
              await remoteAudioRef.current.play();
              console.log("✅ Audio remoto reproduciéndose correctamente");
              console.log("✅ Volumen:", remoteAudioRef.current.volume);
              console.log("✅ Muted:", remoteAudioRef.current.muted);
              console.log("✅ ReadyState:", remoteAudioRef.current.readyState);
              console.log("✅ Paused:", remoteAudioRef.current.paused);
              console.log("✅ CurrentTime:", remoteAudioRef.current.currentTime);
              
              // Verificar periódicamente que el audio esté reproduciéndose
              const checkAudioPlayback = setInterval(() => {
                if (remoteAudioRef.current) {
                  const isPlaying = !remoteAudioRef.current.paused && 
                                   remoteAudioRef.current.currentTime > 0 && 
                                   !remoteAudioRef.current.ended;
                  
                  if (!isPlaying && remoteAudioRef.current.readyState >= 2) {
                    console.warn("⚠️ Audio remoto no está reproduciéndose, intentando reanudar...");
                    remoteAudioRef.current.play().catch(err => {
                      console.error("❌ Error al reanudar:", err);
                    });
                  }
                } else {
                  clearInterval(checkAudioPlayback);
                }
              }, 2000);
              
              // Limpiar el intervalo cuando el componente se desmonte
              setTimeout(() => clearInterval(checkAudioPlayback), 60000);
            }
          } catch (err) {
            console.error("❌ Error al reproducir audio remoto:", err);
            // Intentar reproducir de nuevo después de interacción del usuario
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
        console.warn("⚠️ Elemento de audio no disponible aún, el stream se conectará cuando esté listo");
      }
    });

    // Callback de error
    voiceChatService.onError((errorMsg) => {
      console.error("❌ Error de voz:", errorMsg);
      setError(errorMsg);
    });
  }, [monitorAudioLevel]);

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
      // Limpiar los monitores de audio
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (localAnimationFrameRef.current) {
        cancelAnimationFrame(localAnimationFrameRef.current);
      }
      
      // Limpiar stream procesado
      if (processedStreamRef.current) {
        processedStreamRef.current.getTracks().forEach((track) => track.stop());
        processedStreamRef.current = null;
      }
      
      // Cerrar AudioContext si existe
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(err => {
          console.warn("⚠️ Error al cerrar AudioContext:", err);
        });
        audioContextRef.current = null;
      }
      
      audioDestinationRef.current = null;
      
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
      audioElement.volume = 1.0; // Volumen al máximo
      audioElement.muted = false; // Asegurar que no esté silenciado
      
      // Agregar listeners para debug
      audioElement.addEventListener('play', () => {
        console.log("✅ Audio element empezó a reproducir");
      });
      
      audioElement.addEventListener('playing', () => {
        console.log("✅ Audio element está reproduciendo activamente");
      });
      
      audioElement.addEventListener('pause', () => {
        console.warn("⚠️ Audio element pausado");
      });
      
      audioElement.addEventListener('volumechange', () => {
        console.log("🔊 Cambio de volumen:", {
          volume: audioElement.volume,
          muted: audioElement.muted
        });
      });
      
      audioElement.addEventListener('loadedmetadata', () => {
        console.log("📊 Metadata del audio cargada");
      });
      
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
    audioLevel,

    // Acciones
    startVoiceChat,
    stopVoiceChat,
    toggleMute,
    clearError: () => setError(null),
  };
};

