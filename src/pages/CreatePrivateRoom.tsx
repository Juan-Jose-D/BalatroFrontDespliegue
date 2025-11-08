import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import createBg from '../assets/backgrounds/createRoom-bg.png'
import Button from '../components/Button'
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

  // Cuando ambos jugadores están en la sala y el juego está listo, navegar
  useEffect(() => {
    if (currentGame && currentGame.gameId && roomInfo) {
      console.log('🎮 ¡Juego iniciado!', currentGame)
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

  // Limpiar error cuando se conecta exitosamente
  useEffect(() => {
    if (isConnected && error) {
      clearError()
    }
  }, [isConnected, error, clearError])

  const handleCreateRoom = async () => {
    if (!isConnected) {
      try {
        await connect()
        // Esperar un poco para que la conexión se estabilice
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
      <div className="panel" style={{ width: 520, textAlign: 'center' }}>
        <h2>Crear Sala Privada</h2>

        {/* Estado de conexión */}
        <div style={{ marginTop: 12, fontSize: '0.9rem', color: '#666' }}>
          {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
        </div>

        {/* Código de sala */}
        {roomCode && (
          <div style={{ marginTop: 20 }}>
            <div style={{ fontSize: '1rem', marginBottom: 10, color: '#666' }}>
              📋 Código de Sala
            </div>
            <div style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold',
              letterSpacing: '0.2em',
              fontFamily: 'monospace',
              backgroundColor: '#f0f0f0',
              padding: '15px 20px',
              borderRadius: 8,
              marginBottom: 12,
              border: '3px dashed #999'
            }}>
              {roomCode}
            </div>
            <Button
              variant="neutral"
              onClick={handleCopyCode}
              style={{ fontSize: '0.9rem', padding: '8px 16px' }}
            >
              📋 Copiar Código
            </Button>
          </div>
        )}

        {/* Esperando jugador */}
        {isWaitingForPlayer && (
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: '1.1rem', marginBottom: 10 }}>
              👤 Esperando al segundo jugador...
            </div>
            <div style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>
              Comparte el código con otro jugador para comenzar
            </div>
            {roomInfo && (
              <div style={{ fontSize: '0.75rem', color: '#999', marginTop: 8 }}>
                Host: {roomInfo.hostName}
              </div>
            )}
          </div>
        )}

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

        {/* Mensaje cuando no hay sala */}
        {!roomCode && !isWaitingForPlayer && (
          <div style={{ marginTop: 18, fontSize: '1rem', color: '#888' }}>
            <p>Crea una sala privada con un código único</p>
            <p style={{ fontSize: '0.85rem' }}>Comparte el código con un amigo para jugar</p>
          </div>
        )}

        <div style={{ marginTop: 24 }} className="row center">
          <Button
            variant="neutral"
            className="btn btnNeutral"
            onClick={handleCancel}
          >
            {roomCode ? 'Cancelar Sala' : 'Salir'}
          </Button>

          {!roomCode && (
            <Button
              variant="primary"
              className="btn btnPrimary"
              onClick={handleCreateRoom}
              disabled={isWaitingForPlayer}
            >
              {isConnected ? 'Crear Sala' : 'Conectar y Crear'}
            </Button>
          )}
        </div>

      </div>
    </BackgroundWrapper>
  )
}

