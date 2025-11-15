import { Routes, Route, useSearchParams } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import { GameMultiplayerProvider } from './context/GameMultiplayerContext'
import Menu from './pages/Menu'
import Multiplayer from './pages/Multiplayer'
import CreateRoom from './pages/CreateRoom'
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
  const opponentName = 'Oponente'

  // Si no hay parámetros necesarios, renderizar sin provider (la página manejará la redirección)
  if (!gameId || !playerId) {
    return <PlayMultiplayer />
  }
  
  // Extraer opponentId del gameId o generar uno basado en el gameId
  const opponentId = `opponent-${gameId.substring(0, 8)}`

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
      <Route path="/create" element={<CreateRoom />} />
      <Route path="/join" element={<JoinRoom />} />
      
      {/* Salas privadas con código */}
      <Route path="/private/create" element={<CreatePrivateRoom />} />
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
      <Route path="/config" element={<div style={{ padding: 40 }}><h2>Configuración (pendiente)</h2></div>} />
    </Routes>
  )
}
