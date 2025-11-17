import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import createBg from '../assets/backgrounds/createRoom-bg.png'
import { useRoom } from '../hooks/useRoom'

export default function CreatePrivateRoom() {
  const nav = useNavigate()
  const [playerId] = useState(() => `player-${Math.random().toString(36).substr(2, 9)}`)
  const [playerName] = useState(() => `Jugador-${playerId.slice(-4)}`)
  
  const {
    isConnected,
    roomCode,
    roomInfo,
    isWaitingForPlayer,
    currentGame,
    error,
    connect,
    createRoom,
    leaveRoom,
    clearError,
  } = useRoom({
    playerId,
    playerName,
    autoConnect: false,
  })

  useEffect(() => {
    if (currentGame && currentGame.gameId && roomInfo) {
      const params = new URLSearchParams({
        gameId: currentGame.gameId,
        player1Id: roomInfo.hostId,
        player1Name: roomInfo.hostName || 'Jugador 1',
        player2Id: roomInfo.guestId || '',
        player2Name: roomInfo.guestName || 'Jugador 2',
        playerId: playerId
      })
      nav(`/match-found?${params.toString()}`)
    }
  }, [currentGame, nav, playerId, roomInfo])

  useEffect(() => {
    if (isConnected && error) {
      clearError()
    }
  }, [isConnected, error, clearError])

  const handleCreateRoom = async () => {
    if (!isConnected) {
      try {
        await connect()
        setTimeout(() => createRoom(), 500)
      } catch (err) {
        console.error('Error al conectar:', err)
      }
    } else {
      createRoom()
    }
  }

  const handleCancel = () => {
    if (roomCode) {
      leaveRoom()
    }
    nav('/multiplayer')
  }

  const handleCopyCode = () => {
    if (roomCode) {
      navigator.clipboard.writeText(roomCode)
      alert(`Código copiado: ${roomCode}`)
    }
  }

  return (
    <BackgroundWrapper image={createBg}>
      <div className="createDivPrincipal">

        <h2>Crear Sala Privada</h2>

        {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}

        {roomCode && (
          <div className="createDivCopy">
            <h1>Código de Sala</h1>
            <h1>{roomCode}</h1>

            <button
            className="buttonComoVideo"
            onClick={handleCopyCode}>
              📋 Copiar Código
            </button>
          </div>
        )}

        {isWaitingForPlayer && (
          <div className="createDivWait">

            <h1>👤 Esperando al segundo jugador...</h1>            

            <h1>Comparte el código con otro jugador para comenzar</h1>

            {roomInfo && (
              <h1>Host: {roomInfo.hostName}</h1>
            )}
          </div>
        )}

        {error && (
          <h1>{error}</h1>
        )}

        {!roomCode && !isWaitingForPlayer && (
          <div>
            <h1> Crea una sala privada con un código único </h1>
            <h1> Comparte el código con un amigo para jugar </h1>
          </div>
        )}

        <div className="btn-row center">

          <button
          className='buttonRed'
          onClick={handleCancel}>
            {roomCode ? 'Cancelar Sala' : 'Salir'}
          </button>

          {!roomCode && (
            <button
            className='buttonGreen'
            onClick={handleCreateRoom}
            disabled={isWaitingForPlayer}>
              {isConnected ? 'Crear Sala' : 'Conectar y Crear'}
            </button>
          )}

        </div>

      </div>
    </BackgroundWrapper>
  )
}
