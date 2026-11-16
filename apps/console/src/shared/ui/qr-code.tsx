import type { JSX } from 'react'
import { useMemo } from 'react'
import { encode } from 'uqr'

/** Quiet zone around the code, in modules; scanners need at least four. */
const QUIET_ZONE = 4

type QrCodeProps = {
  value: string
  /** What the code holds, for screen readers ("QR code para o app autenticador"). */
  label: string
}

/**
 * A QR code drawn as one SVG path: dark modules on a white plate in both themes, since
 * scanners read dark-on-light codes most reliably.
 */
export function QrCode({ value, label }: QrCodeProps): JSX.Element {
  const { path, size } = useMemo(() => qrPath(value), [value])

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="size-48 rounded-lg bg-white"
    >
      <path d={path} fill="#18181b" />
    </svg>
  )
}

/** One `h1v1h-1z` square per dark module, offset by the quiet zone. */
function qrPath(value: string): { path: string; size: number } {
  const { data, size } = encode(value, { ecc: 'M', border: QUIET_ZONE })
  const squares: string[] = []

  data.forEach((row, y) => {
    row.forEach((isDark, x) => {
      if (isDark) {
        squares.push(`M${x} ${y}h1v1h-1z`)
      }
    })
  })

  return { path: squares.join(''), size }
}
