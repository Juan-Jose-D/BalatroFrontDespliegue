import React from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import menuBg from '../assets/backgrounds/menu-bg.png'

export default function Menu() {
  const navigate = useNavigate()

  return (
    <BackgroundWrapper image={menuBg}>
      <div className="menuDivPrincipal">

        <div className="menuTitle">
          <h1>Balatro</h1>
          <p className="menuSubTitle">Cliente demo</p>
          <p className="menuSubTitle">Juan - Josue - Alejandro</p>
        </div>

        <div className="menuDivbotones">
          <button
            className="buttonGreen"
            onClick={() => navigate('/solo')}
          >
            Solitario
          </button>

          <button
            className="buttonBlue"
            onClick={() => navigate('/multiplayer')}
          >
            Multijugador
          </button>

          <button
            className="buttonBlueNeon"
            onClick={() => navigate('/howto')}
          >
            ¿Cómo jugar?
          </button>

          <button
            className="buttonGreen"
            onClick={() => navigate('/config')}
          >
            Configuración
          </button>
        </div>

        <div>
          <button
            className="buttonRed"
            onClick={() => { /* window.close() */ }}
          >
            Salir
          </button>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
