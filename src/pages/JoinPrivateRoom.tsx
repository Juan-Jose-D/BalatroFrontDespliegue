import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import createBg from '../assets/backgrounds/createRoom-bg.png'
import Button from '../components/Button'
import { useRoom } from '../hooks/useRoom'

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

  // Cuando se une a la sala y el juego está listo, navegar
  useEffect(() => {
    if (currentGame && currentGame.gameId) {
      console.log('🎮 ¡Juego iniciado!', currentGame)
      // currentGame es roomInfo cuando tiene gameId
      const roomInfo = currentGame as any
      const params = new URLSearchParams({
        gameId: roomInfo.gameId,
        player1Id: roomInfo.hostId,
        player1Name: roomInfo.hostName || 'Jugador 1',
        player2Id: roomInfo.guestId || '',
        player2Name: roomInfo.guestName || 'Jugador 2',
        playerId: playerId
      })
      nav(`/match-found?${params.toString()}`)
    }
  }, [currentGame, nav, playerId])

  // Limpiar error cuando se conecta exitosamente
  useEffect(() => {
    if (isConnected && error) {
      clearError()
    }
  }, [isConnected, error, clearError])

  const handleJoinRoom = async () => {
    if (!codeInput || codeInput.length !== 6) {
      return
    }

    setIsJoining(true)

    if (!isConnected) {
      try {
        await connect()
        // Esperar un poco para que la conexión se estabilice
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

  const handleCancel = () => {
    nav('/multiplayer')
  }

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
    setCodeInput(value)
  }

  return (
    <BackgroundWrapper image={createBg}>
      <div className="panel" style={{ width: 520, textAlign: 'center' }}>
        <h2>Unirse a Sala Privada</h2>

        {/* Estado de conexión */}
        <div style={{ marginTop: 12, fontSize: '0.9rem', color: '#666' }}>
          {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>

        {/* Input de código */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: '1rem', marginBottom: 10, color: '#666' }}>
            🔑 Ingresa el Código de Sala
          </div>
          <input
            type="text"
            value={codeInput}
            onChange={handleCodeChange}
            placeholder="ABC123"
            maxLength={6}
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              letterSpacing: '0.3em',
              fontFamily: 'monospace',
              textAlign: 'center',
              padding: '15px 20px',
              borderRadius: 8,
              border: '3px solid #999',
              backgroundColor: '#f0f0f0',
              width: '100%',
              boxSizing: 'border-box',
              marginBottom: 12,
              textTransform: 'uppercase'
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && codeInput.length === 6) {
                handleJoinRoom()
              }
            }}
          />
          <div style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>
            El código debe tener 6 caracteres
          </div>
        </div>

        {error && (
          <div style={{ 
            marginTop: 12, 
            padding: '10px', 
            backgroundColor: '#fee', 
            borderRadius: 4,
            color: '#c00',
            fontSize: '0.9rem'
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* Mensaje informativo */}
        <div style={{ marginTop: 18, fontSize: '0.95rem', color: '#888' }}>
          <p>Solicita el código al jugador que creó la sala</p>
        </div>

        <div style={{ marginTop: 24 }} className="row center">
          <Button
            variant="neutral"
            className="btn btnNeutral"
            onClick={handleCancel}
          >
            Salir
          </Button>

          <Button
            variant="primary"
            className="btn btnPrimary"
            onClick={handleJoinRoom}
            disabled={codeInput.length !== 6 || isJoining}
          >
            {isJoining ? 'Uniéndose...' : (isConnected ? 'Unirse' : 'Conectar y Unirse')}
          </Button>
        </div>

      </div>
    </BackgroundWrapper>
  )
}

