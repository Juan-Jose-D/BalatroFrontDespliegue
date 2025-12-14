import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import Card from '../components/game/Card'
import JokerCard from '../components/game/JokerCard'
import Shop from '../components/Shop'
import FloatingNotification from '../components/FloatingNotification'
import { useGame } from '../context/GameContext'
import { useNotifications } from '../hooks/useNotifications'
import { POKER_HANDS } from '../types/poker'
import { calculateAllCardEffects } from '../utils/cardEnhancements'
import { calculateInterest } from '../utils/shopLogic'
import type { ShopItem } from '../types/shop'

import background from '../assets/backgrounds/generalBackground.png'

export default function PlayGame() {
  const navigate = useNavigate()
  const [showShop, setShowShop] = useState(false)
  const { notifications, addNotification, removeNotification } = useNotifications()

  const {
    gameState,
    selectCard,
    playSelectedHand,
    discardSelectedCards,
    restartGame,
    advanceRound,
    addJoker,
    buyShopItem,
    rerollShop,
    sellJoker,
    applyEnhancementToCard,
    applyEditionToCard,
    currentHandScore,
    blindInfo,
    canPlay,
    canDiscard,
    selectedCards
  } = useGame()

  // -----------------------
  // NOTIFICACIONES AUTOMÁTICAS
  // -----------------------
  useEffect(() => {
    if (selectedCards.length === 0) return

    const effects = calculateAllCardEffects(selectedCards)

    if (effects.totalMoney > 0) {
      addNotification(`+$${effects.totalMoney} de cartas Gold!`, 'gold', 2500)
    }

    if (effects.brokenCards.length > 0) {
      const cardNames = effects.brokenCards.map(c => c.rank).join(', ')
      addNotification(`💥 ${cardNames} se rompió!`, 'glass', 2500)
    }
  }, [gameState.currentRound.score])

  // -----------------------
  // PANTALLA: VICTORIA
  // -----------------------
  if (gameState.gameStatus === 'won') {
    const interest = calculateInterest(gameState.money)

    if (showShop) {
      return (
        <BackgroundWrapper image={background}>
          <Shop
            ante={gameState.ante}
            money={gameState.money}
            onBuyItem={(item: ShopItem) => buyShopItem(item)}
            onReroll={(cost: number) => rerollShop(cost)}
            onSkip={() => {
              setShowShop(false)
              advanceRound()
            }}
          />
        </BackgroundWrapper>
      )
    }

    return (
      <BackgroundWrapper image={background}>
        <div className="jugarDivVictoria">
          <h1>¡VICTORIA!</h1>
          <h2>{blindInfo.name} Completado</h2>

          <div className="victory-info">
            {[
              ['Puntuación:', `${gameState.currentRound.score} / ${blindInfo.scoreNeeded}`],
              ['Recompensa:', `+$${blindInfo.reward}`],
              ['Interés:', `+$${interest}`],
              ['Dinero Total:', `$${gameState.money + interest}`],
            ].map(([label, value]) => (
              <div key={label} className="jugarRecursos">
                <p className="jugarRecursoNombre">{label}</p>
                <p className="jugarRecursoValor">{value}</p>
              </div>
            ))}
          </div>

          <div className="jugarVictoriaAcciones">
            <button className="buttonRed" onClick={restartGame}>Reiniciar Juego</button>
            <button className="buttonBlue" onClick={() => setShowShop(true)}>Ir a la Tienda</button>
            <button className="buttonPurple" onClick={() => navigate('/menu')}>Salir al Menú</button>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  // -----------------------
  // PANTALLA: DERROTA
  // -----------------------
  if (gameState.gameStatus === 'lost') {
    return (
      <BackgroundWrapper image={background}>
        <div className="jugarDivDerrota">
          <h1>GAME OVER</h1>
          <h2>Te quedaste sin manos</h2>

          <div className="jugarRecursos">
            <p className="jugarRecursoNombre">Puntuación:</p>
            <p className="jugarRecursoValor">{gameState.currentRound.score} / {blindInfo.scoreNeeded}</p>
          </div>

          <div className="jugarRecursos">
            <p className="jugarRecursoNombre">Faltaban:</p>
            <p className="jugarRecursoValor">{blindInfo.scoreRemaining} puntos</p>
          </div>

          <div className="jugarRecursos">
            <p className="jugarRecursoNombre">Ante alcanzado:</p>
            <p className="jugarRecursoValor">{gameState.ante}</p>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button className="buttonGreen" onClick={restartGame}>
              Intentar de Nuevo
            </button>
            <button className="buttonPurple" onClick={() => navigate('/menu')}>
              Salir al Menú
            </button>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  // -----------------------
  // PANTALLA: JUEGO NORMAL
  // -----------------------
  return (
    <BackgroundWrapper image={background}>
      <div className="jugarDivPrincipal">

        {/* HEADER */}
        <h1>Ante {gameState.ante} - {blindInfo.name}</h1>

        <div className="jugarDivDivision">

          {/* INFO */}
          <div className="jugarTablaInformacion">
            <div className="jugarRecursoNombre">Objetivo</div>
            <div className="jugarRecursoValor">
              {gameState.currentRound.score} / {blindInfo.scoreNeeded}
            </div>

            <div className="jugarRecursoProgreso" style={{ width: `${blindInfo.progress}%` }} />
            <div className="jugarRecursoDivision" />

            {[
              ['Manos', gameState.currentRound.handsRemaining],
              ['Descartes', gameState.currentRound.discardsRemaining],
              ['Dinero', `$${gameState.money}`],
            ].map(([label, value]) => (
              <div key={label} className="jugarRecursos">
                <div className="jugarRecursoNombre">{label}</div>
                <div className="jugarRecursoValor">{value}</div>
              </div>
            ))}
          </div>

          {/* ZONA DE JUEGO */}
          <div className="jugarZonaJuego">

            {/* INFO DE MANO */}
            <div className={`panel handinfo-panel ${currentHandScore ? 'handinfo-active' : ''}`}>
              {currentHandScore ? (
                <>
                  {POKER_HANDS[currentHandScore.handType].name} -
                  <span className="handinfo-score">{currentHandScore.score} pts</span>
                  ({currentHandScore.chips} × {currentHandScore.multiplier})
                </>
              ) : ' '}
            </div>

            {/* JOKERS */}
            {gameState.jokers.length > 0 && (
              <div className="jokers-section">
                <div className="jokers-title">
                  Jokers Activos ({gameState.jokers.length}/{gameState.maxJokers})
                </div>

                <div className="jokers-list">
                  {gameState.jokers.map(joker => (
                    <div key={joker.instanceId} className="joker-wrapper">
                      <JokerCard joker={joker} size="medium" />

                      <button
                        className="joker-sell-btn"
                        onClick={() => {
                          const sellPrice = Math.floor(joker.cost / 2)
                          if (confirm(`¿Vender ${joker.name} por $${sellPrice}?`)) {
                            sellJoker(joker.instanceId)
                          }
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CARTAS */}
            <div className="jugarMazo">
              {gameState.hand.map(card => (
                <Card key={card.id} card={card} onClick={() => selectCard(card.id)} />
              ))}
            </div>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="jugarBottonesAcciones">
          {/*
  <button
    className="btn-secondary"
    onClick={handleAddTestJoker}
  >
    + Joker (Test)
  </button>

  <button
    className="btn-secondary"
    onClick={handleTestEdition}
  >
    + Edición (Test)
  </button>

  <button
    className="btn-secondary"
    onClick={handleTestEnhancement}
  >
    + Mejora (Test)
  </button>
*/}

          <button className="buttonBlue" onClick={discardSelectedCards} disabled={!canDiscard}>
            Descartar ({gameState.currentRound.discardsRemaining})
          </button>

          <button className="buttonGreen" onClick={playSelectedHand} disabled={!canPlay}>
            Jugar Mano ({gameState.currentRound.handsRemaining})
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '1rem' }}>
          <button className="buttonRed" onClick={restartGame}>Reiniciar</button>
          <button className="buttonPurple" onClick={() => navigate('/menu')}>Salir al Menú</button>
        </div>

      </div>

      {/* NOTIFICACIONES */}
      {notifications.map(n => (
        <FloatingNotification
          key={n.id}
          notification={n}
          onRemove={removeNotification}
        />
      ))}
    </BackgroundWrapper>
  )
}
