import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'

export default function CreatePrivateRoom() {
  const nav = useNavigate()

  const [playerId] = useState(() => `player-${Math.random().toString(36).slice(2, 11)}`)
  const [playerName] = useState(() => `Jugador-${playerId.slice(-4)}`)

  const {
    isConnected,
    roomCode,
    roomInfo,
    currentGame,
    connect,
    createRoom,
    leaveRoom,
  } = useRoom({
    playerId,
    playerName,
    autoConnect: false,
  })

  // Redirigir cuando ya existe partida creada
  useEffect(() => {
    if (!currentGame || !currentGame.gameId || !roomInfo) return

    const params = new URLSearchParams({
      gameId: currentGame.gameId,
      player1Id: roomInfo.hostId,
      player1Name: roomInfo.hostName || 'Jugador 1',
      playerId,
    })

    nav(`/match-found?${params.toString()}`)
  }, [currentGame, nav, playerId, roomInfo])

  const handleCreateRoom = async () => {
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
          <button className="buttonGreen" onClick={handleCreateRoom}>
            Crear Sala
          </button>
        )}

        <button className="buttonRed" onClick={handleCancel}>
          {roomCode ? 'Cancelar Sala' : 'Salir'}
        </button>

      </div>
    </BackgroundWrapper>
  )
}
