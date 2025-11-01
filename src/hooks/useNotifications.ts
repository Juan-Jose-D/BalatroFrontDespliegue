import { useState, useCallback } from 'react'
import type { Notification } from '../components/FloatingNotification'

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const addNotification = useCallback((
    message: string,
    type: Notification['type'] = 'info',
    duration?: number
  ) => {
    const id = `notif-${Date.now()}-${Math.random()}`
    const notification: Notification = {
      id,
      message,
      type,
      duration
    }

    setNotifications(prev => [...prev, notification])
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const clearNotifications = useCallback(() => {
    setNotifications([])
  }, [])

  return {
    notifications,
    addNotification,
    removeNotification,
    clearNotifications
  }
}
