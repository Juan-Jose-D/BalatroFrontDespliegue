import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'

export default function HowToPlay() {
  const navigate = useNavigate()

  const handleOpenVideo = () => {
    window.open('https://www.youtube.com/watch?v=gA8Xtrjg1fA', '_blank')
  }

  return (
    <BackgroundWrapper image={background}>
      <div className="backgroundPanel">
        <h1>¿Cómo jugar?</h1>

        <p>
          Balatro es un juego de cartas donde el objetivo es ganar puntos formando combinaciones. Cada jugador recibe 5 cartas y, en su turno, puede robar del mazo o del descarte y luego jugar combinaciones como tríos (3 cartas iguales, 5 puntos) o escaleras (3 o más cartas consecutivas del mismo palo, 10 puntos). La ronda termina cuando un jugador se queda sin cartas o se agota el mazo, y gana quien acumule más puntos.
        </p>

        <div className="comoDivVideo">
          <strong className="subTitle" onClick={handleOpenVideo} >Ver video:</strong>
          <button className="buttonComoVideo" id="lol" onClick={handleOpenVideo}>
            Tutorial en YouTube
          </button>
        </div>

        <div className="comoDivVolver">
          <button className="buttonRed" onClick={() => navigate('/')}>
            Volver
          </button>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
