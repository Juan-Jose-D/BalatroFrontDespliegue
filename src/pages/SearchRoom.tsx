import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'


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
    <BackgroundWrapper image={background}>
      <div className="backgroundPanel multijugadorMenuGap" >
        <h1>Emparejamiento<br />Automatico</h1>

        {isConnecting ? '🟡 Conectando...' : (isConnected ? '🟢 Conectado' : '🔴 Desconectado')}

        {isInQueue && (
          <div className='buscarDivSecundario'>
            <p>Buscando oponente...</p>
            {queueStatus && (
              <p>Jugadores en cola: {queueStatus.playersInQueue}</p>
            )}
          </div>
        )}

        {!isInQueue && (
          <button
            className='buttonGreen'
            onClick={handleStartMatchmaking}
            disabled={isInQueue || isConnecting}>
            {isConnecting ? 'Conectando...' : (isConnected ? 'Buscar Partida' : 'Conectar y Buscar')}
          </button>
        )}

        <button
          className='buttonRed'
          onClick={handleCancel}>
          {isInQueue ? 'Cancelar' : 'Salir'}
        </button>
      </div>
    </BackgroundWrapper>
  )
}
