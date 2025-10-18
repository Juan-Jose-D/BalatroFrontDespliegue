import React from 'react'
import BackgroundWrapper from '../components/BackgroundWrapper'
import playBg from '../assets/backgrounds/play-bg.png'

export default function PlayGame() {
  return (
    <BackgroundWrapper image={playBg}>
      <div
        className="center"
        style={{
          flexDirection: 'column',
          height: '100%',
          color: 'var(--fontColor)',
          textShadow: '3px 3px #000',
          fontFamily: 'var(--fontFamily)',
        }}
      >
        <h1
          style={{
            fontSize: '4rem',
            textTransform: 'uppercase',
            letterSpacing: '4px',
          }}
        >
          Creando
        </h1>
      </div>
    </BackgroundWrapper>
  )
}
