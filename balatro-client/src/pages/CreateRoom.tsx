import React from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'

function genCode() {
  // ejemplo simple de código de sala: 6 letras mayúsculas
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export default function CreateRoom() {
  const nav = useNavigate()
  const [code] = React.useState(() => genCode())

  return (
    <div className="app-center">
      <div className="panel" style={{ textAlign: 'center', width: 520 }}>
        <h2>Crear sala</h2>

        <div style={{ marginTop: 18 }} className="center">
          <div className="room-code">{code}</div>
        </div>

        <div style={{ marginTop: 18 }} className="row center">
          <Button variant="neutral" onClick={() => nav('/multiplayer')}>Salir</Button>
          <Button variant="primary" onClick={() => alert('Iniciar partida (pendiente)')}>Jugar</Button>
        </div>
      </div>
    </div>
  )
}
