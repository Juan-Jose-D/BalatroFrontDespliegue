import { Routes, Route, useSearchParams } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import { GameMultiplayerProvider } from './context/GameMultiplayerContext'
import Menu from './pages/Menu'
import Multiplayer from './pages/Multiplayer'
import SearchRoom from './pages/SearchRoom'
import JoinRoom from './pages/JoinRoom'
import CreatePrivateRoom from './pages/CreatePrivateRoom'
import JoinPrivateRoom from './pages/JoinPrivateRoom'
import MatchFound from './pages/MatchFound'
import HowToPlay from './pages/HowToPlay'
import PlayGame from './pages/PlayGame'
import PlayMultiplayer from './pages/PlayMultiplayer'

// Wrapper para PlayMultiplayer que provee el contexto multijugador
function PlayMultiplayerWrapper() {
  const [searchParams] = useSearchParams()
  const gameId = searchParams.get('gameId') || ''
  const playerId = searchParams.get('playerId') || ''
  const player1Id = searchParams.get('player1Id') || ''
  const player2Id = searchParams.get('player2Id') || ''
  const opponentName = 'Oponente'

  // Si no hay parámetros necesarios, renderizar sin provider (la página manejará la redirección)
  if (!gameId || !playerId) {
    return <PlayMultiplayer />
  }
  
  // Determinar quién es el oponente basándose en player1Id y player2Id
  let opponentId: string
  
  if (player1Id && player2Id) {
    // Si tenemos ambos IDs, el oponente es el que NO es el playerId actual
    opponentId = playerId === player1Id ? player2Id : player1Id
  } else {
    // Fallback: generar un ID basado en el gameId (para compatibilidad con código viejo)
    opponentId = `opponent-${gameId.substring(0, 8)}`
  }
  
  console.log('🎮 PlayMultiplayerWrapper - IDs:', {
    gameId,
    playerId,
    player1Id,
    player2Id,
    opponentId,
    isPlayer1: playerId === player1Id
  })

  return (
    <GameMultiplayerProvider 
      gameId={gameId}
      playerId={playerId}
      opponentId={opponentId}
      opponentName={opponentName}
    >
      <PlayMultiplayer />
    </GameMultiplayerProvider>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      <Route path="/multiplayer" element={<Multiplayer />} />
      
      {/* Matchmaking automático */}
      <Route path="/searchRoom" element={<SearchRoom />} />
      <Route path="/join" element={<JoinRoom />} />
      
      {/* Salas privadas con código */}
      <Route path="createPrivateRoom" element={<CreatePrivateRoom />} />
      <Route path="/private/join" element={<JoinPrivateRoom />} />
      
      {/* Pantalla de partida encontrada */}
      <Route path="/match-found" element={<MatchFound />} />
      
      {/* Juego multijugador con provider */}
      <Route path="/play" element={<PlayMultiplayerWrapper />} />
      
      <Route path="/howto" element={<HowToPlay />} />

      {/* Modo Solitario con GameProvider */}
      <Route 
        path="/solo" 
        element={
          <GameProvider>
            <PlayGame />
          </GameProvider>
        } 
      />
    </Routes>
  )
}
