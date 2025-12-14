import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import matchFoundBg from '../assets/backgrounds/createRoom-bg.png'

export default function MatchFound() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [countdown, setCountdown] = useState(3)

  const gameId = searchParams.get('gameId') ?? ''
  const player1Name = searchParams.get('player1Name') ?? 'Jugador 1'
  const player2Name = searchParams.get('player2Name') ?? 'Jugador 2'
  const currentPlayerId = searchParams.get('playerId') ?? ''

  // Auto-redirigir a la página de juego después de 3 segundos
  useEffect(() => {
    if (!gameId || !currentPlayerId) {
      nav('/multiplayer')
      return
    }

    // Countdown
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    // Redirigir después de 3 segundos
    const redirectTimer = setTimeout(() => {
      const params = new URLSearchParams({
        gameId: gameId,
        playerId: currentPlayerId,
        player1Id: searchParams.get('player1Id') || '',
        player2Id: searchParams.get('player2Id') || '',
      });
      nav(`/play?${params.toString()}`)
    }, 3000)

    return () => {
      clearInterval(countdownInterval)
      clearTimeout(redirectTimer)
    }
  }, [gameId, currentPlayerId, nav])

  const handleStartNow = () => {
    if (gameId && currentPlayerId) {
      // Incluir todos los IDs necesarios para el chat de voz
      const params = new URLSearchParams({
        gameId: gameId,
        playerId: currentPlayerId,
        player1Id: searchParams.get('player1Id') || '',
        player2Id: searchParams.get('player2Id') || '',
      });
      nav(`/play?${params.toString()}`)
    }
  }

  const handleCancel = () => nav('/multiplayer')

  return (
    <BackgroundWrapper image={matchFoundBg}>
      <div className="matchDivPanel">
        <h1>Partida Encontrada</h1>

        <div className="jugarRecursos">
          <p className="jugarRecursoNombre">ID de Partida</p>
          <p className="jugarRecursoValor">{gameId}</p>
        </div>

        <h2>
          {player1Name} vs {player2Name}
        </h2>

        {countdown > 0 && (
          <div style={{ 
            fontSize: '1.2rem', 
            margin: '20px 0',
            color: '#4CAF50',
            fontWeight: 'bold'
          }}>
            Iniciando en {countdown} segundo{countdown !== 1 ? 's' : ''}...
          </div>
        )}

        <button className="buttonGreen" onClick={handleStartNow} style={{ marginBottom: '10px' }}>
          Entrar Ahora
        </button>

        <button className="buttonRed" onClick={handleCancel}>
          Cancelar
        </button>

        <div className="tablaConsejos">
          <p>Consejo</p>
          <br />
          <p>Sonríe</p>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
