import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoom } from '../hooks/useRoom'
import { useAuth } from '../context/AuthContext'
import { getPlayerId } from '../utils/playerId'
import BackgroundWrapper from '../components/BackgroundWrapper'
import background from '../assets/backgrounds/generalBackground.png'

export default function JoinPrivateRoom() {
  const nav = useNavigate()
  const { userName, isAuthenticated } = useAuth()
  const [playerId, setPlayerId] = useState<string>('')
  const [playerName, setPlayerName] = useState<string>('')

  // Obtener playerId basado en autenticación
  useEffect(() => {
    const initializePlayerId = async () => {
      const id = await getPlayerId()
      setPlayerId(id)
      // Usar userName de Cognito si está disponible, sino usar un nombre genérico
      setPlayerName(userName || `Jugador-${id.slice(-4)}`)
    }
    initializePlayerId()
  }, [isAuthenticated, userName])
  const [codeInput, setCodeInput] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const {
    isConnected,
    currentGame,
    error,
    connect,
    joinRoom,
    clearError,
  } = useRoom({
    playerId: playerId || 'loading',
    playerName: playerName || 'Cargando...',
    autoConnect: false,
  })

  // Redirigir si ya existe partida
  useEffect(() => {
    if (!currentGame?.gameId || !playerId || playerId === 'loading') return

    const params = new URLSearchParams({
      gameId: currentGame.gameId,
      player1Id: currentGame.hostId ?? '',
      player1Name: currentGame.hostName ?? 'Jugador 1',
      player2Id: currentGame.guestId ?? '',
      player2Name: currentGame.guestName ?? 'Jugador 2',
      playerId,
    })

    nav(`/match-found?${params.toString()}`)
  }, [currentGame, nav, playerId])

  // Limpiar error si cambia la conexión
  useEffect(() => {
    if (isConnected && error) clearError()
  }, [isConnected, error, clearError])

  // Resetear isJoining cuando hay un error o cuando se une exitosamente
  useEffect(() => {
    if (error) {
      setIsJoining(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [error])

  // Limpiar timeout cuando se une exitosamente
  useEffect(() => {
    if (currentGame?.gameId) {
      setIsJoining(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [currentGame])

  const handleJoinRoom = async () => {
    if (!playerId || playerId === 'loading') {
      console.warn('⚠️ Esperando playerId...')
      return
    }

    if (codeInput.length < 5) {
      console.log('⚠️ Código muy corto:', codeInput.length)
      return // Mínimo 5 caracteres
    }

    console.log('🚀 ========== INICIANDO PROCESO DE UNIÓN ==========')
    console.log('🚀 Código:', codeInput)
    console.log('🚀 PlayerId:', playerId)
    setIsJoining(true)

    try {
      // Conectar si no está conectado
      if (!isConnected) {
        console.log('📡 Conectando al servidor...')
        await connect()
        // Esperar un poco para que la conexión se estabilice Y los callbacks se registren
        console.log('⏳ Esperando estabilización de conexión y registro de callbacks...')
        await new Promise(resolve => setTimeout(resolve, 1000)) // Aumentado a 1 segundo
        console.log('✅ Conectado y callbacks deberían estar registrados')
      } else {
        console.log('✅ Ya conectado, verificando callbacks...')
        // Dar tiempo para que los callbacks se registren si aún no lo están
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
      // Limpiar timeout anterior si existe
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
      
      // Normalizar el código antes de unirse (mayúsculas, sin espacios)
      const normalizedCode = codeInput.trim().toUpperCase();
      console.log('🚪 Código original:', codeInput);
      console.log('🚪 Código normalizado:', normalizedCode);
      console.log('🚪 Uniéndose a sala con código normalizado:', normalizedCode);
      joinRoom(normalizedCode)
      console.log('✅ Llamada a joinRoom completada')
      
      // Timeout de seguridad: si no hay respuesta en 10 segundos, resetear el estado
      timeoutRef.current = setTimeout(() => {
        if (isJoining) {
          setIsJoining(false)
          console.log('⏱️ Timeout: No se recibió respuesta del servidor después de 10 segundos')
        }
      }, 10000)
      console.log('🚀 ==========================================')
    } catch (err) {
      console.error('❌ Error al unirse:', err)
      setIsJoining(false)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }

  const handleCancel = () => nav('/multiplayer')

  const handleCodeChange = (e) => {
    const value = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 6)

    setCodeInput(value)
  }

  return (
    <BackgroundWrapper image={background}>
      <div className="backgroundPanel">

        <h1>Unirse a Sala</h1>

        {isConnected ? 'Conectado' : 'Desconectado'}

        <h2>Ingrese código:</h2>

        <input
          type="text"
          value={codeInput}
          onChange={handleCodeChange}
          placeholder="Ingrese código aquí"
          maxLength={6}
          className="codeInput"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && codeInput.length >= 5) {
              handleJoinRoom()
            }
          }}
        />

        {error && (
          <div style={{
            backgroundColor: '#fee',
            border: '2px solid #f88',
            borderRadius: '8px',
            padding: '12px',
            marginTop: '12px',
            color: '#c00'
          }}>
            {error}
          </div>
        )}

        <button
          className="buttonGreen"
          onClick={handleJoinRoom}
          disabled={codeInput.length < 5 || isJoining || !playerId || playerId === 'loading'}
        >
          {!playerId || playerId === 'loading'
            ? 'Cargando...'
            : isJoining
            ? 'Uniéndose...'
            : 'Unirse'}
        </button>

        <button className="buttonRed" onClick={handleCancel}>
          Salir
        </button>

      </div>
    </BackgroundWrapper>
  )
}
