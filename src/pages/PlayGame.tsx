import { useState, useEffect } from 'react'
import BackgroundWrapper from '../components/BackgroundWrapper'
import Card from '../components/game/Card'
import JokerCard from '../components/game/JokerCard'
import Shop from '../components/Shop'
import Button from '../components/Button'
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

  // Detectar efectos de cartas al jugar
  useEffect(() => {
    if (selectedCards.length > 0) {
      const effects = calculateAllCardEffects(selectedCards)
      
      // Mostrar notificación de dinero ganado (Gold cards)
      if (effects.totalMoney > 0) {
        addNotification(`+$${effects.totalMoney} de cartas Gold!`, 'gold', 2500)
      }
      
      // Mostrar notificación de cartas rotas (Glass cards)
      if (effects.brokenCards.length > 0) {
        const cardNames = effects.brokenCards.map(c => c.rank).join(', ')
        addNotification(`💥 ${cardNames} se rompió!`, 'glass', 2500)
      }
    }
  }, [gameState.currentRound.score]) // Se ejecuta cuando cambia el score (después de jugar)

  const getBlindColor = () => {
    switch (gameState.blind) {
      case 'small': return 'var(--colorBlue)'
      case 'big': return 'var(--colorGreen)'
      case 'boss': return 'var(--colorRed)'
      default: return 'var(--colorBlueNeon)'
    }
  }

  // Función para añadir Joker de prueba
  const handleAddTestJoker = () => {
    const randomJoker = getRandomJoker()
    const jokerInstance = createJokerInstance(randomJoker as any)
    const added = addJoker(jokerInstance)
    if (!added) {
      alert('No hay espacio para más Jokers (máximo 5)')
    }
  }

  // Función para probar ediciones en cartas
  const handleTestEdition = () => {
    if (gameState.hand.length === 0) return
    
    const editions: Array<'foil' | 'holographic' | 'polychrome'> = ['foil', 'holographic', 'polychrome']
    const randomEdition = editions[Math.floor(Math.random() * editions.length)]
    const randomCard = gameState.hand[Math.floor(Math.random() * gameState.hand.length)]
    
    applyEditionToCard(randomCard.id, randomEdition)
    alert(`Edición ${randomEdition} aplicada a ${randomCard.rank}${randomCard.suit}`)
  }

  // Función para probar mejoras en cartas
  const handleTestEnhancement = () => {
    if (gameState.hand.length === 0) return
    
    const enhancements: Array<'bonus' | 'mult' | 'wild' | 'glass' | 'steel' | 'stone' | 'gold' | 'lucky'> = 
      ['bonus', 'mult', 'wild', 'glass', 'steel', 'stone', 'gold', 'lucky']
    const randomEnhancement = enhancements[Math.floor(Math.random() * enhancements.length)]
    const randomCard = gameState.hand[Math.floor(Math.random() * gameState.hand.length)]
    
    applyEnhancementToCard(randomCard.id, randomEnhancement)
    alert(`Mejora ${randomEnhancement} aplicada a ${randomCard.rank}${randomCard.suit}`)
  }

  // Pantalla de victoria - Muestra tienda
  if (gameState.gameStatus === 'won') {
    const interest = calculateInterest(gameState.money)
    
    if (showShop) {
      const handleBuyItem = (item: ShopItem): boolean => {
        return buyShopItem(item)
      }

      const handleReroll = (cost: number): boolean => {
        return rerollShop(cost)
      }

      const handleSkipShop = () => {
        setShowShop(false)
        advanceRound()
      }

      return (
        <BackgroundWrapper image={playBg}>
          <Shop
            ante={gameState.ante}
            money={gameState.money}
            onBuyItem={handleBuyItem}
            onReroll={handleReroll}
            onSkip={handleSkipShop}
          />
        </BackgroundWrapper>
      )
    }
    
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
            <div>Interés: +${interest}</div>
            <div>Dinero Total: ${gameState.money + interest}</div>
          </div>
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <Button variant="primary" onClick={() => setShowShop(true)}>
              Ir a la Tienda
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

        {/* Panel de Jokers */}
        {gameState.jokers.length > 0 && (
          <div style={{ width: '100%', maxWidth: '900px' }}>
            <div style={{ 
              textAlign: 'center',
              marginBottom: '10px',
              fontSize: '1.2rem',
              fontWeight: 700,
              color: 'var(--colorBlueNeon)'
            }}>
              Jokers Activos ({gameState.jokers.length}/{gameState.maxJokers})
            </div>
            <div style={{
              display: 'flex',
              gap: '15px',
              flexWrap: 'wrap',
              justifyContent: 'center',
              padding: '15px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '12px'
            }}>
              {gameState.jokers.map(joker => (
                <div key={joker.instanceId} style={{ position: 'relative' }}>
                  <JokerCard
                    joker={joker}
                    size="medium"
                  />
                  <button
                    onClick={() => {
                      const sellPrice = Math.floor(joker.cost / 2)
                      if (globalThis.confirm(`¿Vender ${joker.name} por $${sellPrice}?`)) {
                        sellJoker(joker.instanceId)
                      }
                    }}
                    style={{
                      position: 'absolute',
                      top: '5px',
                      right: '5px',
                      background: 'rgba(255, 0, 0, 0.8)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '30px',
                      height: '30px',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
            variant="secondary"
            onClick={handleAddTestJoker}
          >
            + Joker (Test)
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleTestEdition}
          >
            + Edición (Test)
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleTestEnhancement}
          >
            + Mejora (Test)
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

      {/* Notificaciones flotantes */}
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
