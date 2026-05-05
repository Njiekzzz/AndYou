interface AvatarProps {
  name: string
  color: string
  size?: number
  borderColor?: string
  borderWidth?: number
  style?: React.CSSProperties
}

export function Avatar({ name, color, size = 28, borderColor, borderWidth = 1.5, style }: AvatarProps) {
  const initials = name.slice(0, 2).toUpperCase()
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: Math.max(8, size * 0.38),
        fontWeight: 600,
        color: '#fff',
        border: borderColor ? `${borderWidth}px solid ${borderColor}` : undefined,
        flexShrink: 0,
        ...style,
      }}
    >
      {initials}
    </div>
  )
}
