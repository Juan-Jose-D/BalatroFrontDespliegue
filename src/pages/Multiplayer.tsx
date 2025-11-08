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
          {/* Matchmaking Automático */}
          <div style={{ marginBottom: 16, textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 8, color: '#666' }}>
              🎲 Matchmaking Automático
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 10 }}>
              Emparejar con cualquier jugador disponible
            </p>
            <div className="row center" style={{ gap: 8 }}>
              <Button
                variant="primary"
                className="btn btnPrimary"
                onClick={() => nav('/create')}
                style={{ flex: 1 }}
              >
                Buscar Partida
              </Button>
            </div>
          </div>

          {/* Separador */}
          <div style={{ 
            borderTop: '2px solid #ddd', 
            margin: '16px 0',
            position: 'relative'
          }}>
            <span style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: 'white',
              padding: '0 10px',
              fontSize: '0.85rem',
              color: '#999'
            }}>
              O
            </span>
          </div>

          {/* Salas Privadas */}
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: 8, color: '#666' }}>
              🔐 Salas Privadas
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: 10 }}>
              Jugar con un amigo usando código de 6 dígitos
            </p>
            <div className="row center" style={{ gap: 8 }}>
              <Button
                variant="secondary"
                className="btn btnSecondary"
                onClick={() => nav('/private/create')}
                style={{ flex: 1 }}
              >
                Crear Sala
              </Button>
              <Button
                variant="secondary"
                className="btn btnSecondary"
                onClick={() => nav('/private/join')}
                style={{ flex: 1 }}
              >
                Unirse
              </Button>
            </div>
          </div>

          {/* Botón Volver */}
          <Button
            variant="neutral"
            className="btn btnNeutral"
            onClick={() => nav('/')}
            style={{ marginTop: 24 }}
          >
            Volver al menú
          </Button>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
