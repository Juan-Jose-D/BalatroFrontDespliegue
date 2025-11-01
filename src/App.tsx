import { Routes, Route } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import Menu from './pages/Menu'
import Multiplayer from './pages/Multiplayer'
import CreateRoom from './pages/CreateRoom'
import JoinRoom from './pages/JoinRoom'
import HowToPlay from './pages/HowToPlay'
import PlayGame from './pages/PlayGame'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      <Route path="/multiplayer" element={<Multiplayer />} />
      <Route path="/create" element={<CreateRoom />} />
      <Route path="/join" element={<JoinRoom />} />
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
