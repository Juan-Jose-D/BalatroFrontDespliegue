import React from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import multiplayerBg from '../assets/backgrounds/multiplayer-bg.png'
import Button from '../components/Button'

export default function Multiplayer() {
  const nav = useNavigate()

  return (
    <BackgroundWrapper image={multiplayerBg}>
      <div className="panel multiplayerRoot" >
        <h2>Multijugador</h2>

        <div className="column" style={{ marginTop: 10 }}>
          <Button
            variant="primary"
            className="btn btnPrimary"
            onClick={() => nav('/create')}
          >
            Crear sala
          </Button>

          <Button
            variant="secondary"
            className="btn btnSecondary"
            onClick={() => nav('/join')}
          >
            Unirse a sala
          </Button>

          <Button
            variant="neutral"
            className="btn btnNeutral"
            onClick={() => nav('/')}
          >
            Volver al menú
          </Button>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
