import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Menu from './pages/Menu'
import Multiplayer from './pages/Multiplayer'
import CreateRoom from './pages/CreateRoom'
import JoinRoom from './pages/JoinRoom'
import HowToPlay from './pages/HowToPlay'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Menu />} />
      <Route path="/multiplayer" element={<Multiplayer />} />
      <Route path="/create" element={<CreateRoom />} />
      <Route path="/join" element={<JoinRoom />} />
      <Route path="/howto" element={<HowToPlay />} />

      {/* Rutas placeholders */}
      <Route path="/solo" element={<div style={{padding:40}}><h2>Solitario (pendiente)</h2></div>} />
      <Route path="/config" element={<div style={{padding:40}}><h2>Configuración (pendiente)</h2></div>} />
    </Routes>
  )
}
