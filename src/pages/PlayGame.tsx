import { useState, useEffect } from 'react'
import BackgroundWrapper from '../components/BackgroundWrapper'
import Card from '../components/game/Card'
import Button from '../components/Button'
import playBg from '../assets/backgrounds/play-bg.png'
import type { Card as CardType } from '../types/card'
import { createDeck, shuffleDeck, dealCards, toggleCardSelection, getSelectedCards } from '../utils/deck'
import { calculateHandScore } from '../utils/pokerHands'
import { POKER_HANDS } from '../types/poker'

export default function PlayGame() {
  const [deck, setDeck] = useState<CardType[]>([])
  const [hand, setHand] = useState<CardType[]>([])
  const [score, setScore] = useState(0)
  const [currentHandInfo, setCurrentHandInfo] = useState<string>('')

  // Inicializar mazo y repartir cartas
  useEffect(() => {
    const newDeck = shuffleDeck(createDeck())
    const { dealt, remaining } = dealCards(newDeck, 8)
    setHand(dealt)
    setDeck(remaining)
  }, [])

  // Actualizar información de la mano cuando cambian las cartas seleccionadas
  useEffect(() => {
    const selected = getSelectedCards(hand)
    if (selected.length > 0 && selected.length <= 5) {
      const handScore = calculateHandScore(selected)
      const handData = POKER_HANDS[handScore.handType]
      setCurrentHandInfo(`${handData.name} - ${handScore.score} pts (${handScore.chips} × ${handScore.multiplier})`)
    } else if (selected.length > 5) {
      setCurrentHandInfo('❌ Máximo 5 cartas')
    } else {
      setCurrentHandInfo('Selecciona hasta 5 cartas')
    }
  }, [hand])

  const handleCardClick = (cardId: string) => {
    const selected = getSelectedCards(hand)
    const card = hand.find(c => c.id === cardId)
    
    // No permitir seleccionar más de 5 cartas
    if (card && !card.selected && selected.length >= 5) {
      return
    }
    
    setHand(toggleCardSelection(hand, cardId))
  }

  const handlePlayHand = () => {
    const selected = getSelectedCards(hand)
    if (selected.length === 0 || selected.length > 5) return

    const handScore = calculateHandScore(selected)
    setScore(score + handScore.score)
    
    // Repartir nuevas cartas para reemplazar las jugadas
    const { dealt, remaining } = dealCards(deck, selected.length)
    const newHand = hand
      .filter(c => !c.selected)
      .concat(dealt.map(c => ({ ...c, selected: false })))
    
    setHand(newHand)
    setDeck(remaining)
  }

  const handleReset = () => {
    const newDeck = shuffleDeck(createDeck())
    const { dealt, remaining } = dealCards(newDeck, 8)
    setHand(dealt)
    setDeck(remaining)
    setScore(0)
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
          maxWidth: '1200px',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', color: 'var(--fontColor)' }}>
          <h1 style={{ 
            fontSize: '3rem', 
            margin: '0 0 10px 0',
            textShadow: '3px 3px #000'
          }}>
            DEMO - Fase 1
          </h1>
          <h2 style={{ 
            fontSize: '2rem', 
            margin: 0,
            color: 'var(--colorBlueNeon)',
            textShadow: '2px 2px #000'
          }}>
            Puntuación: {score}
          </h2>
        </div>

        {/* Info de la mano */}
        <div className="panel" style={{ 
          padding: '15px 30px',
          fontSize: '1.5rem',
          fontWeight: 700,
          minWidth: '400px',
          textAlign: 'center'
        }}>
          {currentHandInfo}
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
          {hand.map(card => (
            <Card
              key={card.id}
              card={card}
              onClick={() => handleCardClick(card.id)}
            />
          ))}
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '15px' }}>
          <Button
            variant="primary"
            onClick={handlePlayHand}
            disabled={getSelectedCards(hand).length === 0 || getSelectedCards(hand).length > 5}
          >
            Jugar Mano
          </Button>
          
          <Button
            variant="neutral"
            onClick={handleReset}
          >
            Reiniciar
          </Button>
        </div>

        {/* Info */}
        <div className="panel" style={{ 
          padding: '15px',
          fontSize: '0.9rem',
          maxWidth: '600px',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0 }}>
            <strong>Demo Fase 1:</strong> Haz clic en las cartas para seleccionarlas (máx 5), 
            luego presiona "Jugar Mano" para ver la puntuación. 
            Las cartas jugadas se reemplazan automáticamente.
          </p>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
