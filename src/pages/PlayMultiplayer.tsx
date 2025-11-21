import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import Card from '../components/game/Card'
import JokerCard from '../components/game/JokerCard'
import Shop from '../components/Shop'
import Button from '../components/Button'
import FloatingNotification from '../components/FloatingNotification'
import playBg from '../assets/backgrounds/generalBackground.png'
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

  // -----------------------
  // PANTALLA DE VICTORIA
  // -----------------------
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
        <div className="jugarDivVictoria">
          <h1>¡VICTORIA!</h1>
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
             <button className="buttonRed" onClick={handleExit}>
              Salir
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
      <BackgroundWrapper image={playBg}>
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

          <button className="buttonGreen" onClick={handleExit}>
            Salir
          </button>
        </div>
      </BackgroundWrapper>
    )
  }

  // -----------------------
  // JUEGO NORMAL MULTIJUGADOR
  // -----------------------
  return (
    <BackgroundWrapper image={playBg}>
      <div className="jugarDivPrincipal">

        {/* HEADER */}
        <h1>
          Ante {gameState.ante} - {blindInfo.name}
          <span>
            {isConnected ? '🟢' : '🔴'}
          </span>
        </h1>

        <div className='jugarDivDivision'>
          
          {/* IZQUIERDA: JUGADOR (TÚ) */}
          <div className='jugarTablaInformacion'>
            <div className="jugarRecursoNombre">TÚ</div>
            
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

          {/* CENTRO: ZONA DE JUEGO */}
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
                'Selecciona cartas'
              )}
            </div>

            {/* JOKERS */}
            {gameState.jokers.length > 0 && (
              <div className="jokers-section">
                <div className="jokers-title">
                  Jokers ({gameState.jokers.length}/{gameState.maxJokers})
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

            {/* CARTAS (MAZO) */}
            <div className="jugarMazo">
              {gameState.hand.map(card => (
                <Card 
                  key={card.id} 
                  card={card} 
                  onClick={() => selectCard(card.id)} 
                />
              ))}
            </div>
          </div>

          {/* DERECHA: OPONENTE */}
          <div className='jugarTablaInformacion'>
            <div className="jugarRecursoNombre">
              {opponentName || 'Oponente'}
            </div>
            
            <div className="jugarRecursoNombre">Score</div>
            <div className="jugarRecursoValor">{opponentScore}</div>
             {/* Barra de progreso visual simple para el oponente basada en el mismo objetivo */}
             <div className="jugarRecursoProgreso" style={{ width: `${Math.min((opponentScore / blindInfo.scoreNeeded) * 100, 100)}%` }}></div>
            <div className='jugarRecursoDivision'></div>

            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Manos</div>
              <div className="jugarRecursoValor">{opponentHands}</div>
            </div>

            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Descartes</div>
              <div className="jugarRecursoValor">{opponentDiscards}</div>
            </div>

            <div className='jugarRecursos'>
              <div className="jugarRecursoNombre">Dinero</div>
              <div className="jugarRecursoValor">${opponentMoney}</div>
            </div>
          </div>

        </div>

        {/* BOTONES ACCIONES */}
        <div className="jugarBottonesAcciones">
          <button className="buttonBlue" onClick={() => {
              discardSelectedCards()
              sendGameAction('DISCARD', {
                discardsRemaining: gameState.currentRound.discardsRemaining - 1
              })
            }} disabled={!canDiscard}>
            Descartar ({gameState.currentRound.discardsRemaining})
          </button>

          <button className="buttonGreen" onClick={() => {
              playSelectedHand()
              if (currentHandScore) {
                sendGameAction('PLAY_HAND', {
                  handType: POKER_HANDS[currentHandScore.handType].name,
                  newScore: gameState.currentRound.score + currentHandScore.score,
                  handsRemaining: gameState.currentRound.handsRemaining - 1
                })
              }
            }} disabled={!canPlay}>
            Jugar Mano ({gameState.currentRound.handsRemaining})
          </button>
          
          {/*
          <button className="buttonBlue" onClick={() => setShowChat(!showChat)}>
            💬 Chat
            {hasUnreadMessages && (
              <span></span>
            )}
          </button> */}

          {/*
           <button className="buttonBlue" onClick={handleAddTestJoker}>
            + Joker (Test)
          </button>*/}

          
        </div>
        <button className="buttonRed" onClick={handleExit}>
            Salir
          </button>

        {/* CHAT FLOTANTE / PANEL */}
        {showChat && (
          <div className="panel">
            <h3>Chat</h3>
            <div>
              {chatMessages.map((msg, idx) => (
                <div key={idx}>
                  <b>{msg.playerId === playerId ? 'Tú' : opponentName}:</b> {msg.text}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div>
              <input 
                type="text" 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                onKeyPress={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder="..."
              />
              <button onClick={handleSendChat}>
                ➤
              </button>
            </div>
          </div>
        )}

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