import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'

export default function JoinPrivateRoom() {
  const nav = useNavigate()

  const [playerId] = useState(() => `player-${Math.random().toString(36).slice(2, 11)}`)
  const [playerName] = useState(() => `Jugador-${playerId.slice(-4)}`)
  const [codeInput, setCodeInput] = useState('')
  const [isJoining, setIsJoining] = useState(false)

  const {
    isConnected,
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

  // Redirigir si ya existe partida
  useEffect(() => {
    if (!currentGame?.gameId) return

    const params = new URLSearchParams({
      gameId: currentGame.gameId,
      player1Id: currentGame.hostId ?? '',
      player1Name: currentGame.hostName ?? 'Jugador 1',
      player2Id: currentGame.guestId ?? '',
      player2Name: currentGame.guestName ?? 'Jugador 2',
      playerId,
    })

    nav(`/match-found?${params.toString()}`)
  }, [currentGame, nav, playerId])

  // Limpiar error si cambia la conexión
  useEffect(() => {
    if (isConnected && error) clearError()
  }, [isConnected, error, clearError])

  // Resetear isJoining cuando hay un error
  useEffect(() => {
    if (error) {
      setIsJoining(false)
    }
  }, [error])

  const handleJoinRoom = async () => {
    if (codeInput.length < 5) {
      console.log('⚠️ Código muy corto:', codeInput.length)
      return // Mínimo 5 caracteres
    }

    console.log('🚀 Intentando unirse con código:', codeInput)
    setIsJoining(true)

    try {
      // Conectar si no está conectado
      if (!isConnected) {
        console.log('📡 Conectando al servidor...')
        await connect()
        // Esperar un poco para que la conexión se estabilice
        await new Promise(resolve => setTimeout(resolve, 500))
        console.log('✅ Conectado')
      }
      
      // Unirse a la sala
      console.log('🚪 Uniéndose a sala:', codeInput)
      joinRoom(codeInput)
      
      // Timeout de seguridad: si no hay respuesta en 5 segundos, resetear el estado
      setTimeout(() => {
        setIsJoining(false)
        console.log('⏱️ Timeout: No se recibió respuesta del servidor')
      }, 5000)
    } catch (err) {
      console.error('❌ Error al unirse:', err)
      setIsJoining(false)
    }
  }

  const handleCancel = () => nav('/multiplayer')

  const handleCodeChange = (e) => {
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

        {isConnected ? 'Conectado' : 'Desconectado'}

        <h2>Ingrese código:</h2>

        <input
          type="text"
          value={codeInput}
          onChange={handleCodeChange}
          placeholder="Ingrese código aquí"
          maxLength={6}
          className="codeInput"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && codeInput.length >= 5) {
              handleJoinRoom()
            }
          }}
        />

        {error && (
          <div style={{
            backgroundColor: '#fee',
            border: '2px solid #f88',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '12px',
            color: '#c00'
          }}>
            {error}
          </div>
        )}

        <button
          className="buttonGreen"
          onClick={handleJoinRoom}
          disabled={codeInput.length < 5 || isJoining}
        >
          {isJoining ? 'Uniéndose...' : 'Unirse'}
        </button>

        <button className="buttonRed" onClick={handleCancel}>
          Salir
        </button>

      </div>
    </BackgroundWrapper>
  )
}
