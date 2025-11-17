import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import createBg from '../assets/backgrounds/createRoom-bg.png'
import { useWebSocket } from '../hooks/useWebSocket'

export default function CreateRoom() {
  const nav = useNavigate()
  const [playerId] = useState(() => `player-${Math.random().toString(36).substr(2, 9)}`)
  const [isConnecting, setIsConnecting] = useState(false)

  const {
    isConnected,
    isInQueue,
    queueStatus,
    currentMatch,
    connect,
    joinQueue,
    leaveQueue,
  } = useWebSocket({
    playerId,
    autoConnect: false,
  })

  useEffect(() => {
    if (currentMatch) {
      console.log('¡Partida encontrada!', currentMatch)
      const params = new URLSearchParams({
        gameId: currentMatch.gameId,
        player1Id: currentMatch.player1Id,
        player1Name: currentMatch.player1Name,
        player2Id: currentMatch.player2Id,
        player2Name: currentMatch.player2Name,
        playerId: playerId
      })
      nav(`/match-found?${params.toString()}`)
    }
  }, [currentMatch, nav, playerId])

  const handleStartMatchmaking = async () => {
    if (!isConnected) {
      setIsConnecting(true)
      try {
        await connect()
        joinQueue()
      } catch (err) {
        console.error('Error al conectar:', err)
      } finally {
        setIsConnecting(false)
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
    <BackgroundWrapper image={createBg}>
      <div className="buscarDivPrincipal">
        <h2>Buscar Partida Automática</h2>

        <div>
          {isConnecting ? '🟡 Conectando...' : (isConnected ? '🟢 Conectado' : '🔴 Desconectado')}
        </div>

        {isInQueue && (
          <div className='buscarDivSecundario'>
            <div>⏳ Buscando oponente...</div>
            {queueStatus && (
              <div>
                <p>👥 Jugadores en cola: {queueStatus.playersInQueue}</p>
                {queueStatus.queuePosition && <p>📍 Tu posición: #{queueStatus.queuePosition}</p>}
                {queueStatus.estimatedWaitTime && <p>⏱️ Tiempo estimado: {queueStatus.estimatedWaitTime}s</p>}
              </div>
            )}
          </div>
        )}

        {!isInQueue && (
          <div className='buscarDivSecundario'>
            <p>Sistema de matchmaking automático</p>
            <p>Te emparejaremos con un jugador disponible</p>
          </div>
        )}

        <div className="buscarDivBotones">
          <button
          className='buttonRed'
          onClick={handleCancel}>
            {isInQueue ? 'Cancelar' : 'Salir'}
          </button>

          {!isInQueue && (
            <button
            className='buttonGreen'
            onClick={handleStartMatchmaking}
            disabled={isInQueue || isConnecting}>
              {isConnecting ? 'Conectando...' : (isConnected ? 'Buscar Partida' : 'Conectar y Buscar')}
            </button>
          )}
        </div>
      </div>
    </BackgroundWrapper>
  )
}
