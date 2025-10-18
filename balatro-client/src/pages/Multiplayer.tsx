import React from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

export default function Multiplayer() {
  const nav = useNavigate()
  return (
    <div className="app-center">
      <div className="panel multiplayer-root">
        <h2>Multijugador</h2>
        <div className="column" style={{ marginTop: 8 }}>
          <Button variant="primary" onClick={() => nav('/create')}>Crear sala</Button>
          <Button variant="secondary" onClick={() => nav('/join')}>Unirse a sala</Button>
          <Button variant="neutral" onClick={() => nav('/')}>Volver al menú</Button>
        </div>
      </div>
    </div>
  )
}
