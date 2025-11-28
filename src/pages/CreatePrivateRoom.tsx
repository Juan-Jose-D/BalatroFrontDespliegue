import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { useAuth } from '../context/AuthContext'
import { getPlayerId } from '../utils/playerId'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'

export default function CreatePrivateRoom() {
  const nav = useNavigate()
  const { userName, isAuthenticated } = useAuth()
  const [playerId, setPlayerId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')

  // Obtener playerId basado en autenticación
  useEffect(() => {
    const initializePlayerId = async () => {
      const id = await getPlayerId()
      setPlayerId(id)
      // Usar userName de Cognito si está disponible, sino usar un nombre genérico
      setPlayerName(userName || `Jugador-${id.slice(-4)}`)
    }
    initializePlayerId()
  }, [isAuthenticated, userName])

  const {
    isConnected,
    roomCode,
    roomInfo,
    currentGame,
    connect,
    createRoom,
    leaveRoom,
  } = useRoom({
    playerId: playerId || 'loading',
    playerName: playerName || 'Cargando...',
    autoConnect: false,
  })

  // Redirigir cuando ya existe partida creada
  useEffect(() => {
    if (!currentGame || !currentGame.gameId || !roomInfo || !playerId || playerId === 'loading') return

    const params = new URLSearchParams({
      gameId: currentGame.gameId,
      player1Id: roomInfo.hostId,
      player1Name: roomInfo.hostName || 'Jugador 1',
      player2Id: currentGame.guestId ?? '',
      player2Name: currentGame.guestName ?? 'Jugador 2',
      playerId,
    })

    nav(`/match-found?${params.toString()}`)
  }, [currentGame, nav, playerId, roomInfo])

  const handleCreateRoom = async () => {
    if (!playerId || playerId === 'loading') {
      console.warn('⚠️ Esperando playerId...')
      return
    }

    try {
      // Conectar si no está conectado
      if (!isConnected) {
        await connect()
        // Esperar un poco para que la conexión se estabilice
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      // Crear la sala
      createRoom()
    } catch (err) {
      console.error('Error al crear sala:', err)
    }
  }

  const handleCancel = () => {
    if (roomCode) leaveRoom()
    nav('/multiplayer')
  }

  const handleCopyCode = () => {
    if (!roomCode) return
    navigator.clipboard.writeText(roomCode)
    alert(`Código copiado: ${roomCode}`)
  }

  return (
    <BackgroundWrapper image={background}>
      <div className="backgroundPanel">

        <h1>Crear Sala Privada</h1>

        {isConnected ? 'Conectado' : 'Desconectado'}

        {roomCode && (
          <div className="createDivCopy">
            <h2>Código de Sala:</h2>
            <h2>{roomCode}</h2>

            <button className="buttonComoVideo" onClick={handleCopyCode}>
              Copiar Código
            </button>
          </div>
        )}

        {!roomCode && (
          <button 
            className="buttonGreen" 
            onClick={handleCreateRoom}
            disabled={!playerId || playerId === 'loading'}
          >
            {!playerId || playerId === 'loading' ? 'Cargando...' : 'Crear Sala'}
          </button>
        )}

        <button className="buttonRed" onClick={handleCancel}>
          {roomCode ? 'Cancelar Sala' : 'Salir'}
        </button>

      </div>
    </BackgroundWrapper>
  )
}
