import React from 'react'
import BackgroundWrapper from '../components/BackgroundWrapper'
import playBg from '../assets/backgrounds/play-bg.png'

export default function PlayGame() {
  return (
    <BackgroundWrapper image={playBg}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          flexDirection: 'column',
          color: '#fff',
          textShadow: '3px 3px #000',
        }}
      >
        <h1
          style={{
            fontSize: '4rem',
            textTransform: 'uppercase',
            letterSpacing: '4px',
            fontFamily: "'Pixelify Sans', monospace",
          }}
        >
          Creando
        </h1>
      </div>
    </BackgroundWrapper>
  )
}
