import { Routes, Route, useSearchParams } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import { GameMultiplayerProvider } from './context/GameMultiplayerContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Welcome from './components/auth/Welcome'
import Login from './components/auth/Login'
import Register from './components/auth/Register'
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
    
    // Validación crítica: asegurar que los playerIds sean diferentes
    if (playerId === opponentId) {
      console.error('❌ ERROR CRÍTICO: playerId y opponentId son iguales!', {
        playerId,
        player1Id,
        player2Id,
        opponentId
      })
      // Intentar usar el otro ID como fallback
      opponentId = playerId === player1Id ? player2Id : player1Id
      if (playerId === opponentId) {
        console.error('❌ No se pudo determinar un opponentId válido')
      }
    }
  } else {
    // Fallback: generar un ID basado en el gameId (para compatibilidad con código viejo)
    opponentId = `opponent-${gameId.substring(0, 8)}`
    console.warn('⚠️ Usando opponentId de fallback porque no se proporcionaron player1Id y player2Id')
  }
  
  // Validación adicional: asegurar que los playerIds no sean IDs aleatorios cuando deberían ser usernames de Cognito
  if (playerId.startsWith('player-') || opponentId.startsWith('player-') || opponentId.startsWith('opponent-')) {
    console.warn('⚠️ ADVERTENCIA: Se están usando playerIds aleatorios en lugar de usernames de Cognito', {
      playerId,
      opponentId,
      player1Id,
      player2Id
    })
    console.warn('⚠️ El chat de voz requiere que ambos jugadores estén autenticados con Cognito')
  }
  
  console.log('🎮 PlayMultiplayerWrapper - IDs:', {
    gameId,
    playerId,
    player1Id,
    player2Id,
    opponentId,
    isPlayer1: playerId === player1Id,
    usingCognitoIds: !playerId.startsWith('player-') && !opponentId.startsWith('opponent-')
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
      {/* Rutas públicas */}
      <Route path="/" element={<Welcome />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Rutas protegidas (requieren autenticación) */}
      <Route
        path="/menu"
        element={
          <ProtectedRoute>
            <Menu />
          </ProtectedRoute>
        }
      />
      
      <Route path="/howto" element={<HowToPlay />} />

      {/* Rutas protegidas (requieren autenticación) */}
      <Route
        path="/multiplayer"
        element={
          <ProtectedRoute>
            <Multiplayer />
          </ProtectedRoute>
        }
      />
      
      {/* Matchmaking automático */}
      <Route
        path="/searchRoom"
        element={
          <ProtectedRoute>
            <SearchRoom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/join"
        element={
          <ProtectedRoute>
            <JoinRoom />
          </ProtectedRoute>
        }
      />
      
      {/* Salas privadas con código */}
      <Route
        path="/createPrivateRoom"
        element={
          <ProtectedRoute>
            <CreatePrivateRoom />
          </ProtectedRoute>
        }
      />
      <Route
        path="/private/join"
        element={
          <ProtectedRoute>
            <JoinPrivateRoom />
          </ProtectedRoute>
        }
      />
      
      {/* Pantalla de partida encontrada */}
      <Route
        path="/match-found"
        element={
          <ProtectedRoute>
            <MatchFound />
          </ProtectedRoute>
        }
      />
      
      {/* Juego multijugador con provider */}
      <Route
        path="/play"
        element={
          <ProtectedRoute>
            <PlayMultiplayerWrapper />
          </ProtectedRoute>
        }
      />

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
