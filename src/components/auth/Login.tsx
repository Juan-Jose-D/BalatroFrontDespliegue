/**
 * Componente de Login
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../Button';
import BackgroundWrapper from '../BackgroundWrapper';
import background from '../../assets/backgrounds/generalBackground.png';

export default function Login() {
  const navigate = useNavigate();
  const { login, signInWithGoogle, error, clearError, isLoading } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
    }
  };

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!username || !password) {
      setLocalError('Por favor completa todos los campos');
      return;
    }

    try {
      await login({ username, password });
      navigate('/menu');
    } catch (err: any) {
      let errorMessage = err.message || 'Error al iniciar sesión';
      
      // Si el error es de credenciales incorrectas y el usuario está usando un email,
      // sugerir usar el username en su lugar
      if (err.name === 'NotAuthorizedException' && username.includes('@')) {
        errorMessage = 'Credenciales incorrectas. Si te registraste con un nombre de usuario, úsalo en lugar del email.';
      }
      
      setLocalError(errorMessage);
    }
  };

  const displayError = localError || error;

  return (
    <BackgroundWrapper image={background}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          padding: '20px',
          boxSizing: 'border-box',
          overflow: 'auto',
        }}
      >
        <div
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: '30px',
            borderRadius: '12px',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            maxHeight: '90vh',
            overflow: 'auto',
          }}
        >
          <h1
            style={{
              color: '#fff',
              marginBottom: '20px',
              textAlign: 'center',
              fontSize: '24px',
            }}
          >
            Iniciar Sesión
          </h1>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  display: 'block',
                  color: '#fff',
                  marginBottom: '8px',
                  fontSize: '14px',
                }}
              >
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  backgroundColor: '#1a1a1a',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                placeholder="Ingresa tu usuario"
              />
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  display: 'block',
                  color: '#fff',
                  marginBottom: '8px',
                  fontSize: '14px',
                }}
              >
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  backgroundColor: '#1a1a1a',
                  color: '#fff',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
                placeholder="Ingresa tu contraseña"
              />
            </div>

            {displayError && (
              <div
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid #ef4444',
                  color: '#ef4444',
                  padding: '12px',
                  borderRadius: '6px',
                  marginBottom: '20px',
                  fontSize: '14px',
                }}
              >
                {displayError}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                marginBottom: '12px',
              }}
            >
              {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={() => navigate('/forgot-password')}
              style={{
                background: 'none',
                border: 'none',
                color: '#60a5fa',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline',
              }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>

          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <span style={{ color: '#999', fontSize: '14px' }}>
              ¿No tienes cuenta?{' '}
            </span>
            <button
              onClick={() => navigate('/register')}
              style={{
                background: 'none',
                border: 'none',
                color: '#60a5fa',
                cursor: 'pointer',
                fontSize: '14px',
                textDecoration: 'underline',
              }}
            >
              Regístrate
            </button>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '12px 0',
              color: '#999',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: '#444' }} />
            <span style={{ margin: '0 12px', fontSize: '12px' }}>o</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#444' }} />
          </div>

          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '10px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#fff',
              color: '#000',
              border: '1px solid #ddd',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Iniciar sesión con Google"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          </Button>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                color: '#999',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>
    </BackgroundWrapper>
  );
}

