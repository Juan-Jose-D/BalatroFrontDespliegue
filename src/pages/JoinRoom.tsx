import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { getPlayerId } from '../utils/playerId'
import Button from '../components/Button'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'

export default function JoinRoom() {
  const nav = useNavigate()
  const [playerId, setPlayerId] = useState<string>('')

  // Obtener playerId basado en autenticación
  useEffect(() => {
    const initializePlayerId = async () => {
      const id = await getPlayerId()
      setPlayerId(id)
    }
    initializePlayerId()
  }, [])

  const {
    isConnected,
    isInQueue,
    queueStatus,
    currentMatch,
    error,
    connect,
    joinQueue,
    leaveQueue,
  } = useWebSocket({
    playerId: playerId || 'loading',
    autoConnect: false,
  })

  // Navegar cuando hay partida
  useEffect(() => {
    if (currentMatch && playerId && playerId !== 'loading') {
      const params = new URLSearchParams({
        gameId: currentMatch.gameId,
        playerId: playerId,
        player1Id: currentMatch.player1Id,
        player2Id: currentMatch.player2Id,
      })
      nav(`/play?${params.toString()}`)
    }
  }, [currentMatch, nav, playerId])

  const handleStartMatchmaking = async () => {
    if (!playerId || playerId === 'loading') {
      console.warn('⚠️ Esperando playerId...')
      return
    }

    try {
      if (!isConnected) {
        await connect()
      }
      joinQueue()
    } catch (err) {
      console.error('Error al conectar:', err)
    }
  }

  const handleCancel = () => {
    if (isInQueue) leaveQueue()
    nav('/multiplayer')
  }

  return (
    <BackgroundWrapper image={background}>
      <div className="panel" style={{ width: 520, textAlign: 'center' }}>
        <h2>Buscar Partida Automática</h2>

        {/* Estado conexión */}
        <div style={{ marginTop: 12, fontSize: '0.9rem', color: '#666' }}>
          {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>

        {/* Información de cola */}
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

        {/* Mensaje cuando NO está en cola */}
        {!isInQueue && (
          <div style={{ marginTop: 18, fontSize: '1rem', color: '#888' }}>
            <p>Sistema de matchmaking automático</p>
            <p style={{ fontSize: '0.85rem' }}>
              Te emparejaremos con un jugador disponible
            </p>
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
              disabled={!playerId || playerId === 'loading'}
            >
              {!playerId || playerId === 'loading'
                ? 'Cargando...'
                : isConnected
                ? 'Buscar Partida'
                : 'Conectar y Buscar'}
            </Button>
          )}
        </div>
      </div>
    </BackgroundWrapper>
  )
}
