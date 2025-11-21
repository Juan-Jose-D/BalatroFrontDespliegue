import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'

export default function Multiplayer() {
  const nav = useNavigate()

  return (
    <BackgroundWrapper image={background}>
      <div className="backgroundPanel multijugadorMenuGap">

        <h1>Multijugador</h1>
        <h2>Emparejamiento Automático</h2>
        <button
          className="buttonGreen"
          onClick={() => nav('/searchRoom')}
        >
          Jugar
        </button>

        <h2>Salas Privadas</h2>
        <div className="multijugadorMenuDivSalasBotones">
          <button
            className="buttonGreen"
            onClick={() => nav('/createPrivateRoom')}
          >
            Crear Sala
          </button>

          <button
            className="buttonBlue"
            onClick={() => nav('/private/join')}
          >
            Unirse
          </button>
        </div>
        <button
          className="buttonRed"
          onClick={() => nav('/')}
        >
          Volver
        </button>

      </div>
    </BackgroundWrapper>
  )
}
