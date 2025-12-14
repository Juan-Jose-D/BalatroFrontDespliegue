/**
 * Componente de Registro
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../Button';
import BackgroundWrapper from '../BackgroundWrapper';
import background from '../../assets/backgrounds/generalBackground.png';

export default function Register() {
  const navigate = useNavigate();
  const { register, confirmRegistration, error, clearError, isLoading } = useAuth();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [verificationSuccess, setVerificationSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    // Todos los campos son obligatorios
    if (!username || !email || !password || !confirmPassword) {
      setLocalError('Por favor completa todos los campos');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden');
      return;
    }

    if (password.length < 8) {
      setLocalError('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    try {
      const result = await register({ username: username.trim(), email, password });
      
      console.log('📋 Resultado del registro:', result);
      console.log('📋 nextStep:', result?.nextStep);
      console.log('📋 isSignUpComplete:', result?.isSignUpComplete);
      console.log('📋 nextStep.signUpStep:', result?.nextStep?.signUpStep);
      
      // Verificar si el usuario necesita confirmación
      // Si Cognito está configurado para enviar códigos, result.nextStep existirá
      const hasNextStep = !!result?.nextStep;
      const signUpStep = result?.nextStep?.signUpStep;
      const isComplete = result?.isSignUpComplete === true;
      
      // Si hay nextStep o el registro no está completo, requiere verificación
      // Por defecto, si Cognito envía códigos, siempre habrá nextStep
      const needsConfirmation = 
        hasNextStep ||
        !isComplete ||
        signUpStep === 'CONFIRM_SIGN_UP' ||
        signUpStep === 'CONFIRM_SIGN_UP_WITH_CODE';
      
      console.log('🔍 Verificación de confirmación:', {
        hasNextStep,
        signUpStep,
        isComplete,
        needsConfirmation,
        fullResult: JSON.stringify(result, null, 2),
      });
      
      // Si hay nextStep, SIEMPRE mostrar el campo de verificación
      // Esto asegura que el usuario pueda ingresar el código
      if (hasNextStep || !isComplete) {
        // El usuario necesita ingresar el código de verificación
        console.log('✅ Usuario requiere verificación de código - Mostrando campo de código');
        setNeedsVerification(true);
        // NO redirigir, mostrar el campo de código en la misma página
      } else if (isComplete) {
        // El usuario fue auto-confirmado, redirigir al login
        console.log('✅ Usuario auto-confirmado, redirigiendo al login');
        navigate('/login');
      } else {
        // Por seguridad, si no está claro, mostrar el campo de verificación
        console.log('⚠️ Estado incierto, mostrando campo de verificación por seguridad');
        setNeedsVerification(true);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Error al registrar usuario');
    }
  };

  const handleConfirmCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!verificationCode) {
      setLocalError('Por favor ingresa el código de verificación');
      return;
    }

    try {
      await confirmRegistration(username.trim(), verificationCode);
      // Mostrar mensaje de éxito
      setVerificationSuccess(true);
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setLocalError(err.message || 'Error al confirmar código');
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
            {verificationSuccess ? 'Verificación Exitosa' : needsVerification ? 'Verificar Código' : 'Crear Cuenta'}
          </h1>

          {needsVerification ? (
            <form onSubmit={handleConfirmCode}>
              <div style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid #3b82f6',
                    color: '#60a5fa',
                    padding: '12px',
                    borderRadius: '6px',
                    marginBottom: '12px',
                    fontSize: '13px',
                    textAlign: 'center',
                    lineHeight: '1.5',
                  }}
                >
                  📧 Se ha enviado un código de verificación a <strong>{email}</strong>
                </div>
                <p
                  style={{
                    color: '#999',
                    marginBottom: '12px',
                    fontSize: '12px',
                    textAlign: 'center',
                    lineHeight: '1.4',
                  }}
                >
                  Por favor ingresa el código que recibiste en tu correo electrónico.
                  La verificación es automática una vez ingreses el código correcto.
                </p>
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
                  Código de Verificación
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  disabled={isLoading}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #444',
                    backgroundColor: '#1a1a1a',
                    color: '#fff',
                    fontSize: '16px',
                    boxSizing: 'border-box',
                    textAlign: 'center',
                    letterSpacing: '8px',
                  }}
                  placeholder="000000"
                  maxLength={6}
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
                {isLoading ? 'Verificando...' : 'Verificar Código'}
              </Button>

              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button
                  onClick={() => setNeedsVerification(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#999',
                    cursor: 'pointer',
                    fontSize: '14px',
                  }}
                >
                  ← Volver al registro
                </button>
              </div>
            </form>
          ) : verificationSuccess ? null : (
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
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  backgroundColor: '#1a1a1a',
                  color: '#fff',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
                placeholder="Elige un nombre de usuario"
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
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  backgroundColor: '#1a1a1a',
                  color: '#fff',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
                placeholder="tu@email.com"
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
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  backgroundColor: '#1a1a1a',
                  color: '#fff',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
                placeholder="Mínimo 8 caracteres"
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
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid #444',
                  backgroundColor: '#1a1a1a',
                  color: '#fff',
                  fontSize: '16px',
                  boxSizing: 'border-box',
                }}
                placeholder="Confirma tu contraseña"
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
              {isLoading ? 'Registrando...' : 'Registrarse'}
            </Button>
          </form>
          )}

          {!needsVerification && (
            <>
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <span style={{ color: '#999', fontSize: '14px' }}>
                  ¿Ya tienes cuenta?{' '}
                </span>
                <button
                  onClick={() => navigate('/login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#60a5fa',
                    cursor: 'pointer',
                    fontSize: '14px',
                    textDecoration: 'underline',
                  }}
                >
                  Inicia sesión
                </button>
              </div>

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
            </>
          )}
        </div>
      </div>
    </BackgroundWrapper>
  );
}
