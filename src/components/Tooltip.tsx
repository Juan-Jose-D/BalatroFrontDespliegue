import type { ReactNode } from 'react'
import './Tooltip.css'

interface TooltipProps {
  readonly children: ReactNode
  readonly content: string
  readonly position?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ children, content, position = 'top' }: TooltipProps) {
  return (
    <div className="tooltip-wrapper">
      {children}
      <div className={`tooltip tooltip-${position}`}>
        {content}
      </div>
    </div>
  )
}
