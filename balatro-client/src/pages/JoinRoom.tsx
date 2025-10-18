import React from 'react'
import { useNavigate } from 'react-router-dom'
import BackgroundWrapper from '../components/BackgroundWrapper'
import createBg from '../assets/backgrounds/createRoom-bg.png'
import Button from '../components/Button'

export default function JoinRoom() {
  const nav = useNavigate()
  const [code, setCode] = React.useState('')

  const handleSearch = () => {
    if (!code.trim()) return alert('Ingresa un código')
    alert(`Buscando sala: ${code.toUpperCase()}`)
    // Aquí reemplazas por la llamada al backend / WS
  }

  return (
    <BackgroundWrapper image={createBg}>
      <div className="panel" style={{ width: 480, textAlign: 'center' }}>
        <h2>Unirse a sala</h2>

        <div style={{ marginTop: 16 }} className="center">
          <input
            className="input"
            placeholder="Ingresa el código (ej: A1B2C3)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            style={{ textTransform: 'uppercase' }}
          />
        </div>

        <div style={{ marginTop: 14 }} className="row center">
          <Button variant="primary" onClick={handleSearch}>Buscar</Button>
          <Button variant="neutral" onClick={() => nav('/create')}>Crear sala</Button>
          <Button variant="neutral" onClick={() => nav('/multiplayer')}>Salir</Button>
        </div>
      </div>
    </BackgroundWrapper>
  )
}
