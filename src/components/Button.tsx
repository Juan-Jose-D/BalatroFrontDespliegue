import React from 'react'
import '../styles/global.css'

type ButtonProps = {
  children: React.ReactNode
  variant?: 'primary' | 'secondary' | 'danger' | 'neutral'
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

export default function Button({
  children,
  variant = 'primary',
  onClick,
  className = '',
  style
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      style={style}
    >
      {children}
    </button>
  )
}
