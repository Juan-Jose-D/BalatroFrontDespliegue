import { useSearchParams, useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import matchFoundBg from '../assets/backgrounds/createRoom-bg.png'

export default function MatchFound() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()

  const gameId = searchParams.get('gameId') ?? ''
  const player1Name = searchParams.get('player1Name') ?? 'Jugador 1'
  const player2Name = searchParams.get('player2Name') ?? 'Jugador 2'
  const currentPlayerId = searchParams.get('playerId') ?? ''

  const handleCancel = () => nav('/multiplayer')

  return (
    <BackgroundWrapper image={matchFoundBg}>
      <div className="matchDivPanel">
        <h1>Entrando a partida</h1>

        <div className="jugarRecursos">
          <p className="jugarRecursoNombre">ID de Partida</p>
          <p className="jugarRecursoValor">{gameId}</p>
        </div>

        <h2>
          {player1Name} vs {player2Name}
        </h2>

        <button className="buttonRed" onClick={handleCancel}>
          Salir
        </button>

        <div className="tablaConsejos">
          <p>💡Consejo💡</p>
          <br />
          <p>Sonríe</p>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
