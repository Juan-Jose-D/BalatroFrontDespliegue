import { useState } from 'react'
import { useVoiceChat } from '../hooks/useVoiceChat'
import type { VoiceConnectionState } from '../types/voiceChat'

interface VoiceControlsProps {
  gameId: string
  localCognitoUsername: string
  remoteCognitoUsername: string
}

export default function VoiceControls({
  gameId,
  localCognitoUsername,
  remoteCognitoUsername,
}: VoiceControlsProps) {
  const {
    connectionState,
    isMuted,
    isActive,
    error,
    isConnected,
    availableDevices,
    currentDeviceId,
    startVoiceChat,
    stopVoiceChat,
    toggleMute,
    changeDevice,
    clearError,
  } = useVoiceChat({
    gameId,
    localCognitoUsername,
    remoteCognitoUsername,
    autoStart: false,
  })

  const [showDeviceSelector, setShowDeviceSelector] = useState(false)

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
      {/* Botón del micrófono */}
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

      {/* Botón de selección de micrófono */}
      {isActive && availableDevices.length > 1 && (
        <button
          onClick={() => setShowDeviceSelector(!showDeviceSelector)}
          title="Seleccionar micrófono"
          style={{
            width: '22px',
            height: '22px',
            backgroundColor: 'rgba(139, 92, 246, 0.9)',
            color: '#fff',
            border: 'none',
            borderRadius: '50%',
            padding: '0',
            fontSize: '10px',
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
            e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 1)'
            e.currentTarget.style.transform = 'scale(1.1)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.9)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          🎙️
        </button>
      )}

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

      {/* Indicador de estado */}
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

      {/* Mensaje de error */}
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

      {/* Selector de dispositivos */}
      {showDeviceSelector && isActive && availableDevices.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: '50px',
            right: '15px',
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
            color: '#fff',
            padding: '12px',
            borderRadius: '8px',
            fontSize: '12px',
            minWidth: '250px',
            maxWidth: '300px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
            zIndex: 401,
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ 
            fontWeight: 'bold', 
            marginBottom: '8px', 
            fontSize: '13px',
            color: '#8b5cf6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>🎙️ Seleccionar Micrófono</span>
            <button
              onClick={() => setShowDeviceSelector(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ✕
            </button>
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '6px',
            maxHeight: '200px',
            overflowY: 'auto'
          }}>
            {availableDevices.map((device) => (
              <button
                key={device.deviceId}
                onClick={() => {
                  changeDevice(device.deviceId);
                  setShowDeviceSelector(false);
                }}
                style={{
                  padding: '8px 12px',
                  backgroundColor: currentDeviceId === device.deviceId 
                    ? 'rgba(139, 92, 246, 0.3)' 
                    : 'rgba(255, 255, 255, 0.05)',
                  border: currentDeviceId === device.deviceId 
                    ? '1px solid rgba(139, 92, 246, 0.8)' 
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: '11px',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (currentDeviceId !== device.deviceId) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentDeviceId !== device.deviceId) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                  }
                }}
              >
                <span>{currentDeviceId === device.deviceId ? '✓' : '○'}</span>
                <span style={{ flex: 1 }}>{device.label || 'Sin nombre'}</span>
              </button>
            ))}
          </div>
          
          {availableDevices.length === 0 && (
            <div style={{ 
              padding: '8px', 
              color: '#f59e0b', 
              fontSize: '11px',
              textAlign: 'center'
            }}>
              No hay dispositivos disponibles
            </div>
          )}
        </div>
      )}

      {/* Click fuera para cerrar selector */}
      {showDeviceSelector && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 400,
          }}
          onClick={() => setShowDeviceSelector(false)}
        />
      )}

    </>
  )
}





