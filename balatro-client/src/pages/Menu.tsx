import React from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import menuBg from '../assets/backgrounds/menu-bg.png'
import Button from '../components/Button'

export default function Menu() {
  const nav = useNavigate()

  return (
    <BackgroundWrapper image={menuBg}>
      <div className="panel menu-root" style={{ width: 980, maxWidth: '95%' }}>
        <div className="menu-title">
          <h1>Balatro</h1>
          <p className="small-muted">Cliente — demo</p>
        </div>

        <div className="menu-grid" style={{ marginTop: 8 }}>
          <Button variant="primary" onClick={() => nav('/solo')}>Solitario</Button>
          <Button variant="secondary" onClick={() => nav('/multiplayer')}>Multijugador</Button>
          <Button variant="neutral" onClick={() => nav('/howto')}>Como jugar</Button>
          <Button variant="neutral" onClick={() => nav('/config')}>Configuración</Button>
        </div>

        <div style={{ marginTop: 14 }} className="center">
          <Button variant="danger" onClick={() => { /* window.close() o lógica */ }}>
            Salir
          </Button>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
