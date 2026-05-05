interface StickerSvgProps {
  type: string
  size: number
  color: string
}

export function StickerSvg({ type, size, color }: StickerSvgProps) {
  const s = size
  return (
    <svg width={s} height={s} viewBox="-12 -12 24 24" fill={color}>
      {type === 'heart' && (
        <path d="M0,-5 C-2,-9 -11,-7 -11,-1 C-11,5 0,11 0,11 C0,11 11,5 11,-1 C11,-7 2,-9 0,-5 Z" />
      )}
      {type === 'star' && (
        <polygon points="0,-11 2.6,-4 10,-4 4.1,1.6 6.2,9 0,4.5 -6.2,9 -4.1,1.6 -10,-4 -2.6,-4" />
      )}
      {type === 'sparkle' && (
        <path d="M0,-11 C0.8,-2 0.8,-2 11,0 C0.8,2 0.8,2 0,11 C-0.8,2 -0.8,2 -11,0 C-0.8,-2 -0.8,-2 0,-11 Z" />
      )}
      {type === 'flower' && (
        <>
          <circle cx="0" cy="-7" r="4" opacity="0.85" />
          <circle cx="6.1" cy="-3.5" r="4" opacity="0.85" />
          <circle cx="6.1" cy="3.5" r="4" opacity="0.85" />
          <circle cx="0" cy="7" r="4" opacity="0.85" />
          <circle cx="-6.1" cy="3.5" r="4" opacity="0.85" />
          <circle cx="-6.1" cy="-3.5" r="4" opacity="0.85" />
          <circle cx="0" cy="0" r="4" fill="white" opacity="0.9" />
        </>
      )}
    </svg>
  )
}

export const STICKER_TYPES = ['heart', 'star', 'sparkle', 'flower'] as const
export const DECORATE_COLORS = ['#e8889a', '#c97b5a', '#d4a855', '#7b9e7b', '#7baab5', '#b59fc0']
