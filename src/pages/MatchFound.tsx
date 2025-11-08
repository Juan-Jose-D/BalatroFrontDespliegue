import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import matchFoundBg from '../assets/backgrounds/createRoom-bg.png'
import Button from '../components/Button'

export default function MatchFound() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [countdown, setCountdown] = useState(5)
  const [skipCountdown, setSkipCountdown] = useState(false)

  // Obtener los parámetros de la URL
  const gameId = searchParams.get('gameId') || ''
  const player1Id = searchParams.get('player1Id') || ''
  const player1Name = searchParams.get('player1Name') || 'Jugador 1'
  const player2Id = searchParams.get('player2Id') || ''
  const player2Name = searchParams.get('player2Name') || 'Jugador 2'
  const currentPlayerId = searchParams.get('playerId') || ''

  // Cuenta regresiva automática
  useEffect(() => {
    if (skipCountdown) {
      handleStartGame()
      return
    }

    if (countdown <= 0) {
      handleStartGame()
      return
    }

    const timer = setTimeout(() => {
      setCountdown(countdown - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [countdown, skipCountdown])

  const handleStartGame = () => {
    nav(`/play?gameId=${gameId}&playerId=${currentPlayerId}`)
  }

  const handleSkipCountdown = () => {
    setSkipCountdown(true)
  }

  const handleCancel = () => {
    // Volver al menú de multijugador
    nav('/multiplayer')
  }

  return (
    <BackgroundWrapper image={matchFoundBg}>
      <div className="panel" style={{ width: 600, textAlign: 'center' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: '2.5rem', color: '#10b981', margin: 0 }}>
            🎉 ¡Partida Encontrada!
          </h1>
        </div>

        {/* Información del juego */}
        <div style={{ 
          backgroundColor: '#f0fdf4', 
          padding: '20px',
          borderRadius: 12,
          border: '3px solid #10b981',
          marginBottom: 20
        }}>
          {/* ID del juego */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 8 }}>
              🎲 ID de Partida
            </div>
            <div style={{ 
              fontFamily: 'monospace',
              fontSize: '1rem',
              backgroundColor: '#1f2937',
              color: '#10b981',
              padding: '8px 12px',
              borderRadius: 6,
              wordBreak: 'break-all'
            }}>
              {gameId}
            </div>
          </div>

          {/* Jugadores VS */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: 30,
            marginTop: 25,
            marginBottom: 15
          }}>
            {/* Jugador 1 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1
            }}>
              <div style={{ 
                fontSize: '3rem',
                marginBottom: 10,
                filter: currentPlayerId === player1Id ? 'brightness(1.2) drop-shadow(0 0 10px #10b981)' : 'none'
              }}>
                {currentPlayerId === player1Id ? '👤' : '👥'}
              </div>
              <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: 'bold',
                color: currentPlayerId === player1Id ? '#10b981' : '#333'
              }}>
                {player1Name}
              </div>
              {currentPlayerId === player1Id && (
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#059669',
                  fontWeight: 'bold',
                  marginTop: 4
                }}>
                  (TÚ)
                </div>
              )}
            </div>

            {/* VS */}
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 'bold',
              color: '#dc2626',
              textShadow: '2px 2px 4px rgba(0,0,0,0.2)'
            }}>
              VS
            </div>

            {/* Jugador 2 */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flex: 1
            }}>
              <div style={{ 
                fontSize: '3rem',
                marginBottom: 10,
                filter: currentPlayerId === player2Id ? 'brightness(1.2) drop-shadow(0 0 10px #10b981)' : 'none'
              }}>
                {currentPlayerId === player2Id ? '👤' : '👥'}
              </div>
              <div style={{ 
                fontSize: '1.2rem', 
                fontWeight: 'bold',
                color: currentPlayerId === player2Id ? '#10b981' : '#333'
              }}>
                {player2Name}
              </div>
              {currentPlayerId === player2Id && (
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#059669',
                  fontWeight: 'bold',
                  marginTop: 4
                }}>
                  (TÚ)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cuenta regresiva */}
        {!skipCountdown && countdown > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ 
              fontSize: '3rem', 
              fontWeight: 'bold',
              color: countdown <= 3 ? '#dc2626' : '#059669',
              marginBottom: 10,
              textShadow: '2px 2px 4px rgba(0,0,0,0.1)'
            }}>
              {countdown}
            </div>
            <div style={{ fontSize: '1rem', color: '#666' }}>
              La partida comenzará en...
            </div>
          </div>
        )}

        {/* Botones */}
        <div style={{ marginTop: 20 }} className="row center">
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
            onClick={handleSkipCountdown}
          >
            {skipCountdown ? 'Iniciando...' : '¡Comenzar Ahora!'}
          </Button>
        </div>

        {/* Información adicional */}
        <div style={{ 
          marginTop: 20, 
          padding: '15px',
          backgroundColor: '#fffbeb',
          borderRadius: 8,
          border: '2px solid #f59e0b'
        }}>
          <div style={{ fontSize: '0.9rem', color: '#92400e' }}>
            <strong>💡 Consejo:</strong> Prepárate para demostrar tu habilidad con las cartas. ¡Que gane el mejor!
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  )
}

