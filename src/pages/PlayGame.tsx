import BackgroundWrapper from '../components/BackgroundWrapper'
import Card from '../components/game/Card'
import Button from '../components/Button'
import playBg from '../assets/backgrounds/play-bg.png'
import { useGame } from '../context/GameContext'
import { POKER_HANDS } from '../types/poker'

export default function PlayGame() {
  const {
    gameState,
    selectCard,
    playSelectedHand,
    discardSelectedCards,
    restartGame,
    advanceRound,
    currentHandScore,
    blindInfo,
    canPlay,
    canDiscard
  } = useGame()

  const getBlindColor = () => {
    switch (gameState.blind) {
      case 'small': return 'var(--colorBlue)'
      case 'big': return 'var(--colorGreen)'
      case 'boss': return 'var(--colorRed)'
      default: return 'var(--colorBlueNeon)'
    }
  }

  // Pantalla de victoria
  if (gameState.gameStatus === 'won') {
    return (
      <BackgroundWrapper image={playBg}>
        <div className="panel" style={{ 
          padding: '40px',
          textAlign: 'center',
          maxWidth: '600px'
        }}>
          <h1 style={{ 
            fontSize: '3rem', 
            color: 'var(--colorGreen)',
            marginBottom: '20px'
          }}>
            ¡VICTORIA!
          </h1>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>
            {blindInfo.name} Completado
          </h2>
          <div style={{ fontSize: '1.2rem', marginBottom: '30px' }}>
            <div>Puntuación: {gameState.currentRound.score} / {blindInfo.scoreNeeded}</div>
            <div>Recompensa: +${blindInfo.reward}</div>
            <div>Dinero Total: ${gameState.money}</div>
          </div>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <Button variant="primary" onClick={advanceRound}>
              Siguiente Ronda
            </Button>
            <Button variant="neutral" onClick={restartGame}>
              Reiniciar Juego
            </Button>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  // Pantalla de derrota
  if (gameState.gameStatus === 'lost') {
    return (
      <BackgroundWrapper image={playBg}>
        <div className="panel" style={{ 
          padding: '40px',
          textAlign: 'center',
          maxWidth: '600px'
        }}>
          <h1 style={{ 
            fontSize: '3rem', 
            color: 'var(--colorRed)',
            marginBottom: '20px'
          }}>
            GAME OVER
          </h1>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '20px' }}>
            Te quedaste sin manos
          </h2>
          <div style={{ fontSize: '1.2rem', marginBottom: '30px' }}>
            <div>Puntuación: {gameState.currentRound.score} / {blindInfo.scoreNeeded}</div>
            <div>Faltaban: {blindInfo.scoreRemaining} puntos</div>
            <div>Ante alcanzado: {gameState.ante}</div>
          </div>
          <Button variant="primary" onClick={restartGame}>
            Intentar de Nuevo
          </Button>
        </div>
      </BackgroundWrapper>
    )
  }

  return (
    <BackgroundWrapper image={playBg}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          padding: '20px',
          width: '100%',
          maxWidth: '1400px',
        }}
      >
        {/* Header con Ante y Blind */}
        <div style={{ textAlign: 'center', color: 'var(--fontColor)' }}>
          <h1 style={{ 
            fontSize: '2.5rem', 
            margin: '0',
            textShadow: '3px 3px #000'
          }}>
            Ante {gameState.ante} - {blindInfo.name}
          </h1>
        </div>

        {/* Información de la ronda */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* Panel de objetivo */}
          <div className="panel" style={{ 
            padding: '15px 25px',
            minWidth: '200px',
            textAlign: 'center',
            border: `2px solid ${getBlindColor()}`
          }}>
            <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Objetivo</div>
            <div style={{ 
              fontSize: '2rem', 
              fontWeight: 700,
              color: getBlindColor()
            }}>
              {gameState.currentRound.score} / {blindInfo.scoreNeeded}
            </div>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '4px',
              marginTop: '10px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${blindInfo.progress}%`,
                height: '100%',
                background: getBlindColor(),
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>

          {/* Panel de recursos */}
          <div className="panel" style={{ 
            padding: '15px 25px',
            display: 'flex',
            gap: '30px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Manos</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--colorBlueNeon)' }}>
                {gameState.currentRound.handsRemaining}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Descartes</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--colorRed)' }}>
                {gameState.currentRound.discardsRemaining}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>Dinero</div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--colorGreen)' }}>
                ${gameState.money}
              </div>
            </div>
          </div>
        </div>

        {/* Info de la mano actual */}
        <div className="panel" style={{ 
          padding: '15px 30px',
          fontSize: '1.5rem',
          fontWeight: 700,
          minWidth: '400px',
          textAlign: 'center',
          background: currentHandScore ? 'rgba(0, 255, 246, 0.1)' : 'var(--panelColor)'
        }}>
          {currentHandScore ? (
            <>
              {POKER_HANDS[currentHandScore.handType].name} - {' '}
              <span style={{ color: 'var(--colorBlueNeon)' }}>
                {currentHandScore.score} pts
              </span>
              {' '}({currentHandScore.chips} × {currentHandScore.multiplier})
            </>
          ) : (
            'Selecciona hasta 5 cartas'
          )}
        </div>

        {/* Cartas en mano */}
        <div style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          padding: '20px',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '12px',
          minHeight: '160px'
        }}>
          {gameState.hand.map(card => (
            <Card
              key={card.id}
              card={card}
              onClick={() => selectCard(card.id)}
            />
          ))}
        </div>

        {/* Botones de acción */}
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Button
            variant="primary"
            onClick={playSelectedHand}
            disabled={!canPlay}
          >
            Jugar Mano ({gameState.currentRound.handsRemaining})
          </Button>
          
          <Button
            variant="secondary"
            onClick={discardSelectedCards}
            disabled={!canDiscard}
          >
            Descartar ({gameState.currentRound.discardsRemaining})
          </Button>
          
          <Button
            variant="neutral"
            onClick={restartGame}
          >
            Reiniciar
          </Button>
        </div>

        {/* Info de ayuda */}
        <div className="panel" style={{ 
          padding: '12px 20px',
          fontSize: '0.85rem',
          maxWidth: '700px',
          textAlign: 'center',
          opacity: 0.9
        }}>
          <p style={{ margin: 0 }}>
            <strong>Objetivo:</strong> Alcanza {blindInfo.scoreNeeded} puntos antes de quedarte sin manos. 
            Selecciona cartas y juega tu mejor mano de poker.
          </p>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
