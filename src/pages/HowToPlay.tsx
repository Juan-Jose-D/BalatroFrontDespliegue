import React from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import menuBg from '../assets/backgrounds/menu-bg.png'
import Button from '../components/Button'

export default function HowToPlay() {
  const nav = useNavigate()

  const sampleText = `Aquí va la explicación de Balatro. Puedes poner reglas, objetivos y ejemplos.
  Luego colocaremos un video con una guía paso a paso.`

  const openVideo = () => {
    const url = 'https://www.youtube.com/watch?v=gA8Xtrjg1fA'
    window.open(url, '_blank')
  }

  return (
    <BackgroundWrapper image={menuBg}>
      <div className="panel" style={{ width: 720 }}>
        <h2>Cómo jugar</h2>

        <p style={{ color: 'var(--fontColor)', whiteSpace: 'pre-line' }}>
          {sampleText}
        </p>

        <div style={{ marginTop: 12 }} className="row">
          <span className="smallMuted">Ver video:</span>
          <span
            className="linkLike"
            onClick={openVideo}
            style={{
              color: 'var(--accentColor)',
              cursor: 'pointer',
              textDecoration: 'underline',
            }}
          >
            Tutorial en YouTube
          </span>
        </div>

        <div style={{ marginTop: 14 }} className="center">
          <Button
            variant="neutral"
            className="btn btnNeutral"
            onClick={() => nav('/')}
          >
            Volver
          </Button>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
