import { useEffect, useState } from 'react'
import { voiceChatService } from '../services/VoiceChatService'

interface VoiceDebugPanelProps {
  isActive: boolean
}

export default function VoiceDebugPanel({ isActive }: VoiceDebugPanelProps) {
  const [localTracks, setLocalTracks] = useState<number>(0)
  const [remoteTracks, setRemoteTracks] = useState<number>(0)
  const [localStreamActive, setLocalStreamActive] = useState(false)
  const [remoteStreamActive, setRemoteStreamActive] = useState(false)

  useEffect(() => {
    if (!isActive) {
      setLocalTracks(0)
      setRemoteTracks(0)
      setLocalStreamActive(false)
      setRemoteStreamActive(false)
      return
    }

    const interval = setInterval(() => {
      const localStream = voiceChatService.getLocalStream()
      const remoteStream = voiceChatService.getRemoteStream()

      if (localStream) {
        const tracks = localStream.getAudioTracks()
        setLocalTracks(tracks.length)
        setLocalStreamActive(tracks.some(track => track.enabled && track.readyState === 'live'))
      } else {
        setLocalTracks(0)
        setLocalStreamActive(false)
      }

      if (remoteStream) {
        const tracks = remoteStream.getAudioTracks()
        setRemoteTracks(tracks.length)
        setRemoteStreamActive(tracks.some(track => track.enabled && track.readyState === 'live'))
      } else {
        setRemoteTracks(0)
        setRemoteStreamActive(false)
      }
    }, 500)

    return () => clearInterval(interval)
  }, [isActive])

  if (!isActive) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '15px',
        right: '15px',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: '#fff',
        padding: '12px',
        borderRadius: '8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        minWidth: '220px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
        zIndex: 400,
        border: '1px solid rgba(255, 255, 255, 0.1)',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: '8px', fontSize: '12px', color: '#10b981' }}>
        🔍 Panel de Depuración de Audio
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>🎤 Stream Local:</span>
          <span style={{ 
            color: localStreamActive ? '#10b981' : '#ef4444',
            fontWeight: 'bold'
          }}>
            {localStreamActive ? '✓ Activo' : '✗ Inactivo'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📊 Tracks Locales:</span>
          <span style={{ fontWeight: 'bold', color: localTracks > 0 ? '#10b981' : '#6b7280' }}>
            {localTracks}
          </span>
        </div>

        <div style={{ height: '1px', backgroundColor: 'rgba(255, 255, 255, 0.1)', margin: '4px 0' }} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📻 Stream Remoto:</span>
          <span style={{ 
            color: remoteStreamActive ? '#10b981' : '#ef4444',
            fontWeight: 'bold'
          }}>
            {remoteStreamActive ? '✓ Activo' : '✗ Inactivo'}
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📊 Tracks Remotos:</span>
          <span style={{ fontWeight: 'bold', color: remoteTracks > 0 ? '#10b981' : '#6b7280' }}>
            {remoteTracks}
          </span>
        </div>
        
        {/* Información adicional sobre el stream remoto */}
        {!remoteStreamActive && (
          <div style={{ 
            marginTop: '8px', 
            padding: '6px', 
            backgroundColor: 'rgba(239, 68, 68, 0.1)', 
            borderRadius: '4px',
            fontSize: '10px',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', color: '#f59e0b' }}>
              ⚠️ Stream Remoto Inactivo
            </div>
            <div style={{ color: '#d1d5db', lineHeight: '1.4' }}>
              El stream remoto es el audio que recibes del otro jugador. 
              Si está inactivo, puede ser porque:
            </div>
            <ul style={{ 
              margin: '4px 0 0 16px', 
              padding: 0, 
              color: '#d1d5db',
              fontSize: '9px',
              lineHeight: '1.4'
            }}>
              <li>El otro jugador no ha iniciado el chat de voz</li>
              <li>La conexión WebRTC no se ha establecido completamente</li>
              <li>El OFFER/ANSWER no se intercambió correctamente</li>
              <li>Los ICE candidates no se están intercambiando</li>
            </ul>
          </div>
        )}
      </div>

      <div style={{ 
        marginTop: '8px', 
        padding: '6px', 
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderRadius: '4px',
        fontSize: '10px',
        lineHeight: '1.4'
      }}>
        💡 <strong>Tip:</strong> Si el stream remoto está inactivo, verifica que la otra ventana/pestaña tenga el chat de voz activo.
      </div>
    </div>
  )
}


