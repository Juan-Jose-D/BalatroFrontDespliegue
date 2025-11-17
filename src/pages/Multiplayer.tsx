import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import multiplayerBg from '../assets/backgrounds/multiplayer-bg.png'

export default function Multiplayer() {
  const nav = useNavigate()

  return (
    <BackgroundWrapper image={multiplayerBg}>
      <div className="multijugadorMenuDivPrincipal">

        <h2>Multijugador</h2>

        <div className="multijugadorMenuDivSecundario">

          <div className="multijugadorMenuDivBuscar">
            <h3>Matchmaking Automático</h3>
            <button
              className="buttonBlueNeon"
              onClick={() => nav('/searchRoom')}
            >
              Emparejar con cualquier jugador disponible
            </button>
          </div>
      
          <div className="multijugadorMenuDivSalas">
            <h3 className="">Salas Privadas</h3>
            <p className='menuSubTitle'>Jugar con un amigo</p>

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
          </div>

          <button
            className="buttonRed"
            onClick={() => nav('/')}
          >
            Volver
          </button>

        </div>
      </div>
    </BackgroundWrapper>
  )
}
