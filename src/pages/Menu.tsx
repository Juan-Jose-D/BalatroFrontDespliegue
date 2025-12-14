import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'

export default function Menu() {
  const navigate = useNavigate()
  const { isAuthenticated, user, userEmail, userName, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
    }
  }

  return (
    <BackgroundWrapper image={background}>
      <div className="backgroundPanel">

        <div className="menuTitle">
          <h1>Balatro</h1>
          <p className="subTitle">Cliente demo</p>
          <p className="subTitle">Juan - Josue - Alejandro</p>
          {isAuthenticated && user && (
            <p style={{ color: '#10b981', marginTop: '10px', fontSize: '14px' }}>
              👤 {userName || userEmail || user.username}
            </p>
          )}
        </div>

        <div className="menuDivbotones">
          <button
            className="buttonGreen"
            onClick={() => navigate('/multiplayer')}
            disabled={!isAuthenticated}
            title={!isAuthenticated ? 'Debes iniciar sesión para jugar multijugador' : ''}
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

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
          {isAuthenticated ? (
            <button
              className="buttonRed"
              onClick={handleLogout}
            >
              Cerrar Sesión
            </button>
          ) : (
            <>
              <button
                className="buttonGreen"
                onClick={() => navigate('/login')}
                style={{ marginRight: '10px' }}
              >
                Iniciar Sesión
              </button>
              <button
                className="buttonBlue"
                onClick={() => navigate('/register')}
              >
                Registrarse
              </button>
            </>
          )}
        </div>

      </div>
    </BackgroundWrapper>
  )
}
