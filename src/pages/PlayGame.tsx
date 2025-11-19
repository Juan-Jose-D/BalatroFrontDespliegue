import { useState, useEffect } from 'react'
import BackgroundWrapper from '../components/BackgroundWrapper'
import Card from '../components/game/Card'
import JokerCard from '../components/game/JokerCard'
import Shop from '../components/Shop'
import FloatingNotification from '../components/FloatingNotification'
import playBg from '../assets/backgrounds/play-bg.png'
import { useGame } from '../context/GameContext'
import { useNotifications } from '../hooks/useNotifications'
import { POKER_HANDS } from '../types/poker'
import { getRandomJoker } from '../data/jokers'
import { createJokerInstance } from '../utils/jokerEffects'
import { calculateInterest } from '../utils/shopLogic'
import { calculateAllCardEffects } from '../utils/cardEnhancements'
import type { ShopItem } from '../types/shop'

import background from '../assets/backgrounds/generalBackground.png'

export default function PlayGame() {
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

  useEffect(() => {
    if (selectedCards.length > 0) {
      const effects = calculateAllCardEffects(selectedCards)

      if (effects.totalMoney > 0) {
        addNotification(`+$${effects.totalMoney} de cartas Gold!`, 'gold', 2500)
      }

      if (effects.brokenCards.length > 0) {
        const cardNames = effects.brokenCards.map(c => c.rank).join(', ')
        addNotification(`💥 ${cardNames} se rompió!`, 'glass', 2500)
      }
    }
  }, [gameState.currentRound.score])

  const getBlindColor = () => {
    switch (gameState.blind) {
      case 'small': return 'small-blind'
      case 'big': return 'big-blind'
      case 'boss': return 'boss-blind'
      default: return 'default-blind'
    }
  }

  const handleAddTestJoker = () => {
    const randomJoker = getRandomJoker()
    const jokerInstance = createJokerInstance(randomJoker)
    const added = addJoker(jokerInstance)
    if (!added) alert('No hay espacio para más Jokers (máximo 5)')
  }

  const handleTestEdition = () => {
    if (gameState.hand.length === 0) return

    const editions = ['foil', 'holographic', 'polychrome']
    const randomEdition = editions[Math.floor(Math.random() * editions.length)]
    const randomCard = gameState.hand[Math.floor(Math.random() * gameState.hand.length)]

    applyEditionToCard(randomCard.id, randomEdition)
    alert(`Edición ${randomEdition} aplicada a ${randomCard.rank}${randomCard.suit}`)
  }

  const handleTestEnhancement = () => {
    if (gameState.hand.length === 0) return

    const enhancements = ['bonus', 'mult', 'wild', 'glass', 'steel', 'stone', 'gold', 'lucky']
    const randomEnhancement = enhancements[Math.floor(Math.random() * enhancements.length)]
    const randomCard = gameState.hand[Math.floor(Math.random() * gameState.hand.length)]

    applyEnhancementToCard(randomCard.id, randomEnhancement)
    alert(`Mejora ${randomEnhancement} aplicada a ${randomCard.rank}${randomCard.suit}`)
  }

  // -----------------------
  // PANTALLA DE VICTORIA
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

          <h1 >¡VICTORIA!</h1>
          <h2>{blindInfo.name} Completado</h2>

          <div className="victory-info">
            <div className='jugarRecursos'>
              <p className="jugarRecursoNombre">Puntuación:</p>
              <p className="jugarRecursoValor">{gameState.currentRound.score} / {blindInfo.scoreNeeded}</p>
            </div>
            <div className='jugarRecursos'>
              <p className="jugarRecursoNombre">Recompensa:</p>
              <p className="jugarRecursoValor">+${blindInfo.reward}</p>
            </div>
            <div className='jugarRecursos'>
              <p className="jugarRecursoNombre">Interés:</p>
              <p className="jugarRecursoValor">+${interest}</p>
            </div>
            <div className='jugarRecursos'>
              <p className="jugarRecursoNombre">Dinero Total:</p>
              <p className="jugarRecursoValor">${gameState.money + interest}</p>
            </div>
          </div>

          <div className="jugarVictoriaAcciones">
            <button className="buttonRed" onClick={restartGame}>
              Reiniciar Juego
            </button>

            <button className="buttonBlue" onClick={() => setShowShop(true)}>
              Ir a la Tienda
            </button>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }

  // -----------------------
  // PANTALLA DE DERROTA
  // -----------------------

  if (gameState.gameStatus === 'lost') {
    return (
      <BackgroundWrapper image={background}>
        <div className='jugarDivDerrota'>
          <h1>GAME OVER</h1>
          <h2>Te quedaste sin manos</h2>
          <div className='jugarRecursos'>
            <p className="jugarRecursoNombre">Puntuación:</p>
            <p className="jugarRecursoValor">{gameState.currentRound.score} / {blindInfo.scoreNeeded}</p>
          </div>
          <div className='jugarRecursos'>
            <p className="jugarRecursoNombre">Faltaban:</p>
            <p className="jugarRecursoValor">{blindInfo.scoreRemaining} puntos</p>
          </div>
          <div className='jugarRecursos'>
            <p className="jugarRecursoNombre">Ante alcanzado: </p>
            <p className="jugarRecursoValor">{gameState.ante}</p>
          </div>
          
          <button className="buttonGreen" onClick={restartGame}>
            Intentar de Nuevo
          </button>
        </div>
      </BackgroundWrapper>
    )
  }

  // -----------------------
  // JUEGO NORMAL
  // -----------------------

  return (
    <BackgroundWrapper image={background}>
      <div className="jugarDivPrincipal">

        {/* HEADER */}
        <h1>Ante {gameState.ante} - {blindInfo.name}</h1>
        <div className='jugarDivDivision'>
          {/* INFORMACION */}
          <div className='jugarTablaInformacion'>
            <div className="jugarRecursoNombre">Objetivo</div>
            <div className="jugarRecursoValor">{gameState.currentRound.score} / {blindInfo.scoreNeeded}</div>
            <div className="jugarRecursoProgreso" style={{ width: `${blindInfo.progress}%` }}></div>
            <div className='jugarRecursoDivision'></div>

            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Manos</div>
              <div className="jugarRecursoValor">{gameState.currentRound.handsRemaining}</div>
            </div>

            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Descartes</div>
              <div className="jugarRecursoValor">{gameState.currentRound.discardsRemaining}</div>
            </div>

            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Dinero</div>
              <div className="jugarRecursoValor">${gameState.money}</div>
            </div>

          </div>
          <div className='jugarZonaJuego'>
            {/* INFO DE MANO */}
            <div className={`panel handinfo-panel ${currentHandScore ? 'handinfo-active' : ''}`}>
              {currentHandScore ? (
                <>
                  {POKER_HANDS[currentHandScore.handType].name} -
                  <span className="handinfo-score">{currentHandScore.score} pts</span>
                  ({currentHandScore.chips} × {currentHandScore.multiplier})
                </>
              ) : (
                ' '
              )}
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










        {/* BOTONES ACCIONES*/}
        <div className="jugarBottonesAcciones">


          <button className="buttonBlue" onClick={discardSelectedCards} disabled={!canDiscard}>
            Descartar ({gameState.currentRound.discardsRemaining})
          </button>
          <button className="buttonGreen" onClick={playSelectedHand} disabled={!canPlay}>
            Jugar Mano ({gameState.currentRound.handsRemaining})
          </button>

          {/*
          <button className="btn-secondary" onClick={handleAddTestJoker}>+ Joker (Test)</button>
          <button className="btn-secondary" onClick={handleTestEdition}>+ Edición (Test)</button>
          <button className="btn-secondary" onClick={handleTestEnhancement}>+ Mejora (Test)</button>
          */}
        </div>

        <button className="buttonRed" onClick={restartGame}>
          Reiniciar
        </button>

      </div>

      {/* NOTIFICACIONES */}
      {notifications.map(notification => (
        <FloatingNotification
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </BackgroundWrapper>
  )
}
