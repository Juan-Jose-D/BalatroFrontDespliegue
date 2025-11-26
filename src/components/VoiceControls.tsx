import { useVoiceChat } from '../hooks/useVoiceChat'
import type { VoiceConnectionState } from '../types/webrtc'
import VoiceDebugPanel from './VoiceDebugPanel'

interface VoiceControlsProps {
  gameId: string
  localPlayerId: string
  remotePlayerId: string
  isInitiator?: boolean
}

export default function VoiceControls({
  gameId,
  localPlayerId,
  remotePlayerId,
  isInitiator = false,
}: VoiceControlsProps) {
  const {
    connectionState,
    isMuted,
    isActive,
    error,
    isConnected,
    audioLevel,
    startVoiceChat,
    stopVoiceChat,
    toggleMute,
    clearError,
  } = useVoiceChat({
    gameId,
    localPlayerId,
    remotePlayerId,
    isInitiator,
    autoStart: false,
  })

  const getStateColor = (state: VoiceConnectionState): string => {
    switch (state) {
      case 'connected':
        return '#10b981'
      case 'connecting':
        return '#f59e0b'
      case 'failed':
        return '#ef4444'
      case 'disconnected':
      case 'closed':
        return '#6b7280'
      default:
        return '#6b7280'
    }
  }

  const getStateText = (state: VoiceConnectionState): string => {
    switch (state) {
      case 'connected':
        return 'Conectado'
      case 'connecting':
        return 'Conectando...'
      case 'failed':
        return 'Error'
      case 'disconnected':
        return 'Desconectado'
      case 'closed':
        return 'Cerrado'
      default:
        return 'Desconocido'
    }
  }

  const handleToggle = () => {
    if (!isActive) {
      startVoiceChat()
    } else {
      toggleMute()
    }
  }

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: '15px',
          right: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          zIndex: 400,
        }}
      >
      {/* Botón minimalista del micrófono */}
      <button
        onClick={handleToggle}
        disabled={isActive && !isConnected}
        title={!isActive ? 'Activar chat de voz' : isMuted ? 'Activar micrófono' : 'Silenciar'}
        style={{
          width: '26px',
          height: '26px',
          backgroundColor: !isActive 
            ? 'rgba(16, 185, 129, 0.9)' 
            : isMuted 
              ? 'rgba(239, 68, 68, 0.9)' 
              : 'rgba(59, 130, 246, 0.9)',
          border: 'none',
          borderRadius: '50%',
          padding: '0',
          fontSize: '12px',
          cursor: (isActive && !isConnected) ? 'not-allowed' : 'pointer',
          opacity: (isActive && !isConnected) ? 0.5 : 1,
          transition: 'all 0.15s',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
        }}
        onMouseEnter={(e) => {
          if (!isActive || isConnected) {
            e.currentTarget.style.transform = 'scale(1.1)'
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)'
        }}
      >
        {!isActive ? '🎤' : isMuted ? '🔇' : '🎤'}
      </button>

      {/* Botón X solo cuando está activo */}
      {isActive && (
        <button
          onClick={stopVoiceChat}
          title="Cerrar chat de voz"
          style={{
            width: '22px',
            height: '22px',
            backgroundColor: 'rgba(75, 85, 99, 0.9)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            padding: '0',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.15s',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(55, 65, 81, 1)'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.9)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          ✕
        </button>
      )}

      {/* Indicador de estado (punto pequeño) */}
      {isActive && (
        <div
          title={`Estado: ${getStateText(connectionState)}`}
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            backgroundColor: getStateColor(connectionState),
            boxShadow: `0 0 7px ${getStateColor(connectionState)}`,
            animation: connectionState === 'connecting' ? 'pulse 1.5s infinite' : 'none',
            cursor: 'help',
          }}
        />
      )}

      {/* Indicador de nivel de audio */}
      {isActive && isConnected && (
        <div
          title={`Nivel de audio: ${audioLevel}`}
          style={{
            width: '60px',
            height: '8px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid rgba(255, 255, 255, 0.3)',
          }}
        >
          <div
            style={{
              width: `${audioLevel}%`,
              height: '100%',
              backgroundColor: audioLevel > 60 ? '#10b981' : audioLevel > 30 ? '#f59e0b' : '#6b7280',
              transition: 'width 0.1s ease-out, background-color 0.2s',
              boxShadow: audioLevel > 30 ? '0 0 4px currentColor' : 'none',
            }}
          />
        </div>
      )}

      {/* Mensaje de error si hay */}
      {error && (
        <div
          style={{
            position: 'fixed',
            top: '50px',
            right: '15px',
            backgroundColor: 'rgba(239, 68, 68, 0.95)',
            color: '#fff',
            padding: '8px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            maxWidth: '250px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
            zIndex: 400,
          }}
        >
          <div style={{ marginBottom: '4px', fontWeight: 600 }}>❌ Error</div>
          <div>{error}</div>
          <button
            onClick={clearError}
            style={{
              marginTop: '6px',
              backgroundColor: 'transparent',
              border: '1px solid #fff',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '3px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            Cerrar
          </button>
        </div>
      )}

      {/* CSS para animación */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
      </div>

      {/* Panel de depuración */}
      <VoiceDebugPanel isActive={isActive} />
    </>
  )
}

