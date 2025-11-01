import React from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import createBg from '../assets/backgrounds/createRoom-bg.png'
import Button from '../components/Button'

function genCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  let out = ''
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)]
  return out
}

export default function CreateRoom() {
  const nav = useNavigate()
  const [code] = React.useState(() => genCode())

  return (
    <BackgroundWrapper image={createBg}>
      <div className="panel" style={{ width: 520, textAlign: 'center' }}>
        <h2>Crear sala</h2>

        <div style={{ marginTop: 18 }} className="center">
          <div className="roomCode">{code}</div>
        </div>

        <div style={{ marginTop: 18 }} className="row center">
          <Button
            variant="neutral"
            className="btn btnNeutral"
            onClick={() => nav('/multiplayer')}
          >
            Salir
          </Button>

          <Button
            variant="primary"
            className="btn btnPrimary"
            onClick={() => alert('Iniciar partida (pendiente)')}
          >
            Jugar
          </Button>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
