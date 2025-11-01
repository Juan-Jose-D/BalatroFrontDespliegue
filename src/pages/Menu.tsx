import React from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import menuBg from '../assets/backgrounds/menu-bg.png'
import Button from '../components/Button'

export default function Menu() {
  const nav = useNavigate()

  return (
    <BackgroundWrapper image={menuBg}>
      <div className="menuRoot">
        <div className="menuTitle">
          <h1>Balatro</h1>
          <p className="smallMuted">Cliente — demo</p>
        </div>

        <div className="menuGrid" style={{ marginTop: 8 }}>
          <Button
            variant="primary"
            className="btn btnPrimary"
            onClick={() => nav('/solo')}
          >
            Solitario
          </Button>

          <Button
            variant="secondary"
            className="btn btnSecondary"
            onClick={() => nav('/multiplayer')}
          >
            Multijugador
          </Button>

          <Button
            variant="neutral"
            className="btn btnNeutral"
            onClick={() => nav('/howto')}
          >
            Cómo jugar
          </Button>

          <Button
            variant="neutral"
            className="btn btnNeutral"
            onClick={() => nav('/config')}
          >
            Configuración
          </Button>
        </div>

        <div style={{ marginTop: 14 }} className="center">
          <Button
            variant="danger"
            className="btn btnDanger"
            onClick={() => { /* window.close() */ }}
          >
            Salir
          </Button>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
