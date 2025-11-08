import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import playBg from '../assets/backgrounds/play-bg.png'
import Button from '../components/Button'

export default function PlayMultiplayer() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const [gameData, setGameData] = useState({
    gameId: searchParams.get('gameId') || '',
    playerId: searchParams.get('playerId') || '',
  })

  useEffect(() => {
    // Si no hay gameId, redirigir al menú
    if (!gameData.gameId) {
      nav('/multiplayer')
    }
  }, [gameData.gameId, nav])

  const handleExit = () => {
    nav('/multiplayer')
  }

  return (
    <BackgroundWrapper image={playBg}>
      <div className="panel" style={{ width: 600, textAlign: 'center' }}>
        <h2>🎮 Partida Multijugador</h2>

        {/* Estado de la partida */}
        <div style={{ 
          marginTop: 20,
          padding: 20,
          backgroundColor: '#f0fdf4',
          borderRadius: 8,
          border: '2px solid #10b981'
        }}>
          <h3 style={{ fontSize: '1.5rem', color: '#059669', margin: '0 0 12px 0' }}>
            🎉 ¡Partida Encontrada!
          </h3>
          <p style={{ color: '#666', fontSize: '0.95rem', margin: '8px 0' }}>
            La partida ha iniciado correctamente
          </p>
        </div>

        {/* Información de la partida */}
        <div style={{ 
          marginTop: 20,
          padding: 20,
          backgroundColor: '#f9fafb',
          borderRadius: 8,
          textAlign: 'left'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>📋 Información</h4>
          
          <div style={{ marginBottom: 10 }}>
            <strong style={{ color: '#666' }}>Game ID:</strong>
            <div style={{
              fontFamily: 'monospace',
              backgroundColor: '#fff',
              padding: '8px 12px',
              borderRadius: 4,
              marginTop: 4,
              fontSize: '0.9rem',
              border: '1px solid #ddd',
              wordBreak: 'break-all'
            }}>
              {gameData.gameId}
            </div>
          </div>

          <div>
            <strong style={{ color: '#666' }}>Tu Player ID:</strong>
            <div style={{
              fontFamily: 'monospace',
              backgroundColor: '#fff',
              padding: '8px 12px',
              borderRadius: 4,
              marginTop: 4,
              fontSize: '0.9rem',
              border: '1px solid #ddd',
              wordBreak: 'break-all'
            }}>
              {gameData.playerId}
            </div>
          </div>
        </div>

        {/* Mensaje temporal */}
        <div style={{ 
          marginTop: 20,
          padding: 16,
          backgroundColor: '#fffbeb',
          borderRadius: 8,
          border: '2px solid #f59e0b'
        }}>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#92400e' }}>
            🚧 <strong>Página en Desarrollo</strong>
          </p>
          <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#92400e' }}>
            Esta es una página temporal. Aquí se mostrará el juego real cuando esté implementado.
          </p>
        </div>

        {/* Funcionalidad temporal */}
        <div style={{ 
          marginTop: 20,
          padding: 20,
          backgroundColor: '#fff',
          borderRadius: 8,
          border: '1px solid #ddd',
          textAlign: 'left'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>🎯 Próximas Funcionalidades</h4>
          <ul style={{ margin: 0, paddingLeft: 20, color: '#666', fontSize: '0.9rem' }}>
            <li>Visualización del tablero de juego</li>
            <li>Sistema de turnos entre jugadores</li>
            <li>Chat en tiempo real</li>
            <li>Sincronización de estado del juego</li>
            <li>Sistema de puntuación en vivo</li>
            <li>Notificaciones de acciones del oponente</li>
          </ul>
        </div>

        {/* Simulación de acciones */}
        <div style={{ marginTop: 20 }}>
          <h4 style={{ fontSize: '1rem', color: '#333', marginBottom: 12 }}>
            🎲 Acciones Disponibles
          </h4>
          <div className="row center" style={{ gap: 8, flexWrap: 'wrap' }}>
            <Button
              variant="primary"
              onClick={() => alert('🃏 Función de jugar carta en desarrollo')}
              style={{ flex: '1 1 auto', minWidth: 140 }}
            >
              Jugar Carta
            </Button>
            <Button
              variant="secondary"
              onClick={() => alert('💬 Sistema de chat en desarrollo')}
              style={{ flex: '1 1 auto', minWidth: 140 }}
            >
              Abrir Chat
            </Button>
            <Button
              variant="neutral"
              onClick={() => alert('📊 Panel de estadísticas en desarrollo')}
              style={{ flex: '1 1 auto', minWidth: 140 }}
            >
              Ver Stats
            </Button>
          </div>
        </div>

        {/* Botones de navegación */}
        <div style={{ marginTop: 24 }} className="row center">
          <Button
            variant="neutral"
            className="btn btnNeutral"
            onClick={handleExit}
          >
            🚪 Salir de la Partida
          </Button>
        </div>

        {/* Información de desarrollo */}
        <div style={{ 
          marginTop: 16,
          fontSize: '0.75rem',
          color: '#999',
          fontStyle: 'italic'
        }}>
          💡 Esta página se irá completando con la lógica de juego real
        </div>
      </div>
    </BackgroundWrapper>
  )
}

