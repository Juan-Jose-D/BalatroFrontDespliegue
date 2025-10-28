import '../styles/global.css'

type ButtonProps = {
  readonly children: React.ReactNode
  readonly variant?: 'primary' | 'secondary' | 'danger' | 'neutral'
  readonly onClick?: () => void
  readonly className?: string
  readonly style?: React.CSSProperties
  readonly disabled?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  onClick,
  className = '',
  style,
  disabled = false
}: ButtonProps) {
  return (
    <button
      className={`btn btn-${variant} ${className}`}
      onClick={onClick}
      style={style}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
