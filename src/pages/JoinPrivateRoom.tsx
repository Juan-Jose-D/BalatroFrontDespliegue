import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'


export default function JoinPrivateRoom() {
  const nav = useNavigate()
  const [playerId] = useState(() => `player-${Math.random().toString(36).substr(2, 9)}`)
  const [playerName] = useState(() => `Jugador-${playerId.slice(-4)}`)
  const [codeInput, setCodeInput] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const {
    isConnected,
    roomCode,
    currentGame,
    error,
    connect,
    joinRoom,
    clearError,
  } = useRoom({
    playerId,
    playerName,
    autoConnect: false,
  })

  useEffect(() => {
    if (currentGame && currentGame.gameId) {
      const roomInfo = currentGame
      const params = new URLSearchParams({
        gameId: roomInfo.gameId ?? '',
        player1Id: roomInfo.hostId ?? '',
        player1Name: roomInfo.hostName ?? 'Jugador 1',
        player2Id: roomInfo.guestId ?? '',
        player2Name: roomInfo.guestName ?? 'Jugador 2',
        playerId: playerId ?? ''
      })
      nav(`/match-found?${params.toString()}`)
    }
  }, [currentGame, nav, playerId])

  useEffect(() => {
    if (isConnected && error) {
      clearError()
    }
  }, [isConnected, error, clearError])

  const handleJoinRoom = async () => {
    if (!codeInput || codeInput.length !== 6) return

    setIsJoining(true)

    if (!isConnected) {
      try {
        await connect()
        setTimeout(() => {
          joinRoom(codeInput)
          setIsJoining(false)
        }, 500)
      } catch (err) {
        console.error('Error al conectar:', err)
        setIsJoining(false)
      }
    } else {
      joinRoom(codeInput)
      setTimeout(() => setIsJoining(false), 1000)
    }
  }

  const handleCancel = () => nav('/multiplayer')

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6)

    setCodeInput(value)
  }


  return (
    <BackgroundWrapper image={background}>
      <div className="backgroundPanel">

        <h1>Unirse a Sala</h1>
        {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        <h2>Ingrese codigo:</h2>
        <input
            type="text"
            value={codeInput}
            onChange={handleCodeChange}
            placeholder="Ingrese codigo aquí"
            maxLength={6}
            className="codeInput"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && codeInput.length === 6) {
                handleJoinRoom()
              }
            }}
          />  

        {error && (
          <p>⚠️ {error}</p>
        )}

        <button
            className="buttonGreen"
            onClick={handleJoinRoom}
            disabled={codeInput.length !== 6 || isJoining}
          >
            {isJoining ? 'Uniéndose...' : (isConnected ? 'Unirse' : 'Conectar y Unirse')}
          </button>

          <button className="buttonRed" onClick={handleCancel}>
            Salir
          </button>

      </div>
    </BackgroundWrapper>
  )
}
