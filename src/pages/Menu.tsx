import React from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'

export default function Menu() {
  const navigate = useNavigate()

  return (
    <BackgroundWrapper image={background}>
      <div className="backgroundPanel">

        <div className="menuTitle">
          <h1>Balatro</h1>
          <p className="subTitle">Cliente demo</p>
          <p className="subTitle">Juan - Josue - Alejandro</p>
        </div>

        <div className="menuDivbotones">
          <button
            className="buttonGreen"
            onClick={() => navigate('/multiplayer')}
          >
            Multijugador
          </button>

          <button
            className="buttonBlue"
            onClick={() => navigate('/solo')}
          >
            Solitario
          </button>

          <button
            className="buttonPurple"
            onClick={() => navigate('/howto')}
          >
            ¿Cómo jugar?
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
