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
    const url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' // reemplaza por tu link real
    window.open(url, '_blank')
  }

  return (
    <BackgroundWrapper image={menuBg}>
      <div className="panel" style={{ width: 720 }}>
        <h2>Cómo jugar</h2>
        <p style={{ color: 'var(--muted)', whiteSpace: 'pre-line' }}>{sampleText}</p>

        <div style={{ marginTop: 12 }} className="row">
          <span className="small-muted">Ver video:</span>
          <span className="link-like" onClick={openVideo}>Tutorial en YouTube</span>
        </div>

        <div style={{ marginTop: 14 }}>
          <Button variant="neutral" onClick={() => nav('/')}>Volver</Button>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
