import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import Card from '../components/game/Card'
import JokerCard from '../components/game/JokerCard'
import Shop from '../components/Shop'
import Button from '../components/Button'
import FloatingNotification from '../components/FloatingNotification'
import playBg from '../assets/backgrounds/play-bg.png'
import { useGameMultiplayer } from '../context/GameMultiplayerContext'
import { useNotifications } from '../hooks/useNotifications'
import { POKER_HANDS } from '../types/poker'
import { getRandomJoker } from '../data/jokers'
import { createJokerInstance } from '../utils/jokerEffects'
import { calculateInterest } from '../utils/shopLogic'
import { calculateAllCardEffects } from '../utils/cardEnhancements'
import { webSocketService } from '../services/WebSocketService'
import type { ShopItem } from '../types/shop'

function PlayMultiplayerGame() {
  const nav = useNavigate()
  const [showShop, setShowShop] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { notifications, addNotification, removeNotification } = useNotifications()
  
  const {
    game,
    opponentName,
    opponentScore,
    opponentMoney,
    opponentHands,
    opponentDiscards,
    playerId,
    chatMessages,
    sendChatMessage,
    sendGameAction,
    lastOpponentAction
  } = useGameMultiplayer()
  
  // Verificar si el WebSocket está conectado
  const [isConnected, setIsConnected] = useState(false)
  
  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(webSocketService.isWebSocketConnected())
    }
    
    checkConnection()
    const interval = setInterval(checkConnection, 1000)
    
    return () => clearInterval(interval)
  }, [])

  const {
    gameState,
    selectCard,
    playSelectedHand,
    discardSelectedCards,
    advanceRound,
    addJoker,
    buyShopItem,
    rerollShop,
    sellJoker,
    currentHandScore,
    blindInfo,
    canPlay,
    canDiscard,
    selectedCards
  } = game

  // Auto-scroll chat
  useEffect(() => {
    if (showChat && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages, showChat])

  // Detectar mensajes nuevos cuando el chat está cerrado
  useEffect(() => {
    if (!showChat && chatMessages.length > 0) {
      setHasUnreadMessages(true)
    }
  }, [chatMessages, showChat])

  // Marcar mensajes como leídos cuando se abre el chat
  useEffect(() => {
    if (showChat) {
      setHasUnreadMessages(false)
    }
  }, [showChat])

  // Notificación de acciones del oponente
  useEffect(() => {
    if (lastOpponentAction) {
      addNotification(`${opponentName} ${lastOpponentAction}`, 'opponent', 2500)
    }
  }, [lastOpponentAction, opponentName, addNotification])

  // Detectar efectos de cartas al jugar
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
      case 'small': return 'var(--colorBlue)'
      case 'big': return 'var(--colorGreen)'
      case 'boss': return 'var(--colorRed)'
      default: return 'var(--colorBlueNeon)'
    }
  }

  const handleSendChat = () => {
    if (chatInput.trim()) {
      sendChatMessage(chatInput)
      setChatInput('')
    }
  }

  const handleAddTestJoker = () => {
    const randomJoker = getRandomJoker()
    const jokerInstance = createJokerInstance(randomJoker as any)
    const added = addJoker(jokerInstance)
    if (!added) {
      alert('No hay espacio para más Jokers (máximo 5)')
    }
  }

  const handleExit = () => {
    if (confirm('¿Estás seguro de que quieres salir de la partida?')) {
      nav('/multiplayer')
    }
  }

  // Pantalla de victoria - Muestra tienda
  if (gameState.gameStatus === 'won') {
    const interest = calculateInterest(gameState.money)
    
    if (showShop) {
      const handleBuyItem = (item: ShopItem): boolean => {
        const success = buyShopItem(item)
        if (success) {
          const itemName = item.joker?.name || item.enhancement?.name || 'item'
          sendGameAction('BUY_ITEM', {
            itemName,
            newMoney: gameState.money - item.cost
          })
        }
        return success
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
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button variant="primary" onClick={() => setShowShop(true)}>
              Ir a la Tienda
            </Button>
            <Button variant="neutral" onClick={handleExit}>
              Salir de la Partida
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
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <Button variant="neutral" onClick={handleExit}>
              Salir de la Partida
            </Button>
          </div>
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
        {/* Header con modo multijugador */}
        <div style={{ textAlign: 'center', color: 'var(--fontColor)' }}>
          <div style={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '1rem',
            marginBottom: '5px'
          }}>
            <span>🎮 Partida Multijugador</span>
            <span style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isConnected ? '#10b981' : '#ef4444',
              display: 'inline-block',
              animation: isConnected ? 'none' : 'pulse 2s infinite'
            }} />
            <span style={{ fontSize: '0.8rem', opacity: 0.7 }}>
              {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
            </span>
          </div>
          <h1 style={{ 
            fontSize: '2.5rem', 
            margin: '0',
            textShadow: '3px 3px #000'
          }}>
            Ante {gameState.ante} - {blindInfo.name}
          </h1>
        </div>

        {/* Información de ambos jugadores */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
          {/* Panel del jugador */}
          <div className="panel" style={{ 
            flex: 1,
            minWidth: '300px',
            padding: '15px',
            border: '2px solid var(--colorBlueNeon)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '10px', fontWeight: 700 }}>
              TÚ
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Score</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: getBlindColor() }}>
                  {gameState.currentRound.score}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Manos</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--colorBlueNeon)' }}>
                  {gameState.currentRound.handsRemaining}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Descartes</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--colorRed)' }}>
                  {gameState.currentRound.discardsRemaining}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Dinero</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--colorGreen)' }}>
                  ${gameState.money}
                </div>
              </div>
            </div>
          </div>

          {/* Panel del objetivo */}
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
              {blindInfo.scoreNeeded}
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

          {/* Panel del oponente */}
          <div className="panel" style={{ 
            flex: 1,
            minWidth: '300px',
            padding: '15px',
            border: '2px solid var(--colorRed)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '10px', fontWeight: 700 }}>
              {opponentName}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Score</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: getBlindColor() }}>
                  {opponentScore}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Manos</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--colorBlueNeon)' }}>
                  {opponentHands}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Descartes</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--colorRed)' }}>
                  {opponentDiscards}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Dinero</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--colorGreen)' }}>
                  ${opponentMoney}
                </div>
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
            onClick={() => {
              playSelectedHand()
              if (currentHandScore) {
                sendGameAction('PLAY_HAND', {
                  handType: POKER_HANDS[currentHandScore.handType].name,
                  newScore: gameState.currentRound.score + currentHandScore.score,
                  handsRemaining: gameState.currentRound.handsRemaining - 1
                })
              }
            }}
            disabled={!canPlay}
          >
            Jugar Mano ({gameState.currentRound.handsRemaining})
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => {
              discardSelectedCards()
              sendGameAction('DISCARD', {
                discardsRemaining: gameState.currentRound.discardsRemaining - 1
              })
            }}
            disabled={!canDiscard}
          >
            Descartar ({gameState.currentRound.discardsRemaining})
          </Button>
          
          <Button
            variant="secondary"
            onClick={() => setShowChat(!showChat)}
            style={{ position: 'relative' }}
          >
            💬 Chat
            {hasUnreadMessages && (
              <span style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '10px',
                height: '10px',
                backgroundColor: '#ef4444',
                borderRadius: '50%',
                border: '2px solid white',
                animation: 'pulse 2s infinite'
              }} />
            )}
          </Button>
          
          <Button
            variant="secondary"
            onClick={handleAddTestJoker}
          >
            + Joker (Test)
          </Button>
          
          <Button
            variant="neutral"
            onClick={handleExit}
          >
            Salir
          </Button>
        </div>

        {/* Panel de Chat */}
        {showChat && (
          <div className="panel" style={{ 
            width: '100%',
            maxWidth: '600px',
            padding: '20px'
          }}>
            <h3 style={{ margin: '0 0 15px 0', textAlign: 'center' }}>💬 Chat</h3>
            <div style={{
              height: '200px',
              overflowY: 'auto',
              marginBottom: '15px',
              padding: '10px',
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px'
            }}>
              {chatMessages.length === 0 ? (
                <div style={{ textAlign: 'center', opacity: 0.6, padding: '20px' }}>
                  No hay mensajes aún
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div 
                    key={idx}
                    style={{
                      marginBottom: '10px',
                      padding: '8px 12px',
                      background: msg.playerId === playerId ? 'rgba(0, 255, 246, 0.1)' : 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      borderLeft: `3px solid ${msg.playerId === playerId ? 'var(--colorBlueNeon)' : 'var(--colorRed)'}`
                    }}
                  >
                    <div style={{ fontSize: '0.8rem', opacity: 0.7, marginBottom: '4px' }}>
                      {msg.playerId === playerId ? 'Tú' : opponentName}
                    </div>
                    <div>{msg.text}</div>
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="Escribe un mensaje..."
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '8px',
                  border: '2px solid var(--colorBlueNeon)',
                  background: 'rgba(0,0,0,0.5)',
                  color: 'var(--fontColor)',
                  fontSize: '1rem'
                }}
              />
              <Button
                variant="primary"
                onClick={handleSendChat}
                disabled={!chatInput.trim()}
              >
                Enviar
              </Button>
            </div>
          </div>
        )}
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

// Wrapper que maneja la inicialización
export default function PlayMultiplayer() {
  const nav = useNavigate()
  const [searchParams] = useSearchParams()
  const gameId = searchParams.get('gameId') || ''
  const playerId = searchParams.get('playerId') || ''

  useEffect(() => {
    // Si no hay gameId o playerId, redirigir al menú
    if (!gameId || !playerId) {
      nav('/multiplayer')
    }
  }, [gameId, playerId, nav])

  if (!gameId || !playerId) {
    return null
  }

  return <PlayMultiplayerGame />
}


