import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import Button from '../components/Button'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'



export default function JoinRoom() {
  const nav = useNavigate()
  const [playerId] = useState(() => `player-${Math.random().toString(36).substr(2, 9)}`)
  
  const {
    isConnected,
    isInQueue,
    queueStatus,
    currentMatch,
    error,
    connect,
    joinQueue,
    leaveQueue,
    clearError,
  } = useWebSocket({
    playerId,
    autoConnect: false,
  })

  // Cuando se encuentra una partida, navegar a la pantalla de juego
  useEffect(() => {
    if (currentMatch) {
      console.log('🎮 ¡Partida encontrada!', currentMatch)
      nav(`/play?gameId=${currentMatch.gameId}&playerId=${playerId}`)
    }
  }, [currentMatch, nav, playerId])

  const handleStartMatchmaking = async () => {
    if (!isConnected) {
      try {
        await connect()
        joinQueue()
      } catch (err) {
        console.error('Error al conectar:', err)
        // El error ya se muestra en la UI a través del estado 'error'
      }
    } else {
      joinQueue()
    }
  }

  const handleCancel = () => {
    if (isInQueue) {
      leaveQueue()
    }
    nav('/multiplayer')
  }

  return (
    <BackgroundWrapper image={background}>
      <div className="panel" style={{ width: 520, textAlign: 'center' }}>
        <h2>Buscar Partida Automática</h2>

        {/* Estado de conexión */}
        <div style={{ marginTop: 12, fontSize: '0.9rem', color: '#666' }}>
          {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>

        {/* Información de la cola */}
        {isInQueue && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: '1.2rem', marginBottom: 10 }}>
              ⏳ Buscando oponente...
            </div>
            {queueStatus && (
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                <p>👥 Jugadores en cola: {queueStatus.playersInQueue}</p>
                {queueStatus.queuePosition && (
                  <p>📍 Tu posición: #{queueStatus.queuePosition}</p>
                )}
                {queueStatus.estimatedWaitTime && (
                  <p>⏱️ Tiempo estimado: {queueStatus.estimatedWaitTime}s</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mensaje cuando no está en cola */}
        {!isInQueue && (
          <div style={{ marginTop: 18, fontSize: '1rem', color: '#888' }}>
            <p>Sistema de matchmaking automático</p>
            <p style={{ fontSize: '0.85rem' }}>Te emparejaremos con un jugador disponible</p>
          </div>
        )}

        <div style={{ marginTop: 18 }} className="row center">
          <Button
            variant="neutral"
            className="btn btnNeutral"
            onClick={handleCancel}
          >
            {isInQueue ? 'Cancelar' : 'Salir'}
          </Button>

          {!isInQueue && (
            <Button
              variant="primary"
              className="btn btnPrimary"
              onClick={handleStartMatchmaking}
              disabled={isInQueue}
            >
              {isConnected ? 'Buscar Partida' : 'Conectar y Buscar'}
            </Button>
          )}
        </div>

      </div>
    </BackgroundWrapper>
  )
}
