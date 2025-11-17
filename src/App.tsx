import { Routes, Route } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
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
import Config from './pages/Config'

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
      
      {/* Juego multijugador */}
      <Route path="/play" element={<PlayMultiplayer />} />
      
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
      <Route path="/config" element={<Config />}/>
    </Routes>
  )
}
