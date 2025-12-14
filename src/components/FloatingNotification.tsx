import { useEffect, useState } from 'react'
import './FloatingNotification.css'

export interface Notification {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error' | 'gold' | 'glass' | 'opponent'
  duration?: number
}

interface FloatingNotificationProps {
  readonly notification: Notification
  readonly onRemove: (id: string) => void
}

export default function FloatingNotification({ notification, onRemove }: FloatingNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Trigger animation
    setTimeout(() => setIsVisible(true), 10)

    // Auto remove after duration
    const duration = notification.duration || 2000
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onRemove(notification.id), 300) // Wait for fade out
    }, duration)

    return () => clearTimeout(timer)
  }, [notification, onRemove])

  return (
    <div 
      className={`floating-notification ${notification.type} ${isVisible ? 'visible' : ''}`}
    >
      {notification.type === 'gold' && <span className="icon">💰</span>}
      {notification.type === 'glass' && <span className="icon">💥</span>}
      {notification.type === 'success' && <span className="icon">✓</span>}
      {notification.type === 'error' && <span className="icon">✕</span>}
      {notification.type === 'warning' && <span className="icon">⚠</span>}
      {notification.type === 'opponent' && <span className="icon">👤</span>}
      <span className="message">{notification.message}</span>
    </div>
  )
}
