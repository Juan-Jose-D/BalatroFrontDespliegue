import React from 'react'
import { useNavigate } from 'react-router-dom'

export default function Config() {
  const navigate = useNavigate()

  return (
    <div className="comoDivPrincipal">
      <h1>En construcción</h1>
      <div className="comoDivVolver">
        <button
          className="buttonRed"
          onClick={() => navigate('/')}
        >
          Volver
        </button>
      </div>
    </div>
  )
}
