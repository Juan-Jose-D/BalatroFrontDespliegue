import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWebSocket } from '../hooks/useWebSocket'
import { useAuth } from '../context/AuthContext'
import { getPlayerId } from '../utils/playerId'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'

export default function CreateRoom() {
  const nav = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [playerId, setPlayerId] = useState<string>('')

  // Obtener playerId basado en autenticación
  useEffect(() => {
    const initializePlayerId = async () => {
      const id = await getPlayerId()
      setPlayerId(id)
    }
    initializePlayerId()
  }, [isAuthenticated, user])
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
    playerId: playerId || 'loading', // Usar 'loading' temporalmente si aún no se ha cargado
    autoConnect: false,
  })

  // Redirige cuando se encuentra partida
  useEffect(() => {
    if (!currentMatch || !playerId) return

    const params = new URLSearchParams({
      gameId: currentMatch.gameId,
      player1Id: currentMatch.player1Id,
      player1Name: currentMatch.player1Name,
      player2Id: currentMatch.player2Id,
      player2Name: currentMatch.player2Name,
      playerId,
    })

    nav(`/match-found?${params.toString()}`)
  }, [currentMatch, nav, playerId])

  // Inicia matchmaking
  const handleStartMatchmaking = async () => {
    if (!playerId || playerId === 'loading') {
      console.warn('⚠️ Esperando playerId...')
      return
    }

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
      return
    }

    joinQueue()
  }

  // Cancelar / salir
  const handleCancel = () => {
    if (isInQueue) leaveQueue()
    nav('/multiplayer')
  }

  return (
    <BackgroundWrapper image={background}>
      <div className="backgroundPanel multijugadorMenuGap">

        <h1>Emparejamiento<br />Automático</h1>

        {/* Estado de conexión */}
        {isConnecting
          ? '🟡 Conectando...'
          : isConnected
          ? '🟢 Conectado'
          : '🔴 Desconectado'}

        {/* Info de cola */}
        {isInQueue && (
          <div className="buscarDivSecundario">
            <p>Buscando oponente...</p>
            {queueStatus && (
              <p>Jugadores en cola: {queueStatus.playersInQueue}</p>
            )}
          </div>
        )}

        {/* Botón buscar partida */}
        {!isInQueue && (
          <button
            className="buttonGreen"
            onClick={handleStartMatchmaking}
            disabled={isConnecting || !playerId || playerId === 'loading'}
          >
            {!playerId || playerId === 'loading'
              ? 'Cargando...'
              : isConnecting
              ? 'Conectando...'
              : isConnected
              ? 'Buscar Partida'
              : 'Conectar y Buscar'}
          </button>
        )}

        {/* Botón cancelar o salir */}
        <button
          className="buttonRed"
          onClick={handleCancel}
        >
          {isInQueue ? 'Cancelar' : 'Salir'}
        </button>

      </div>
    </BackgroundWrapper>
  )
}
