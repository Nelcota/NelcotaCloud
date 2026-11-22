import type { JSX } from 'react'

/**
 * The favicon doubles as a decorative brand mark next to the product name.
 */
export function LogoMark({ size = 32 }: { size?: 24 | 32 | 48 }): JSX.Element {
  return <img src="/favicon.png" alt="" width={size} height={size} className="rounded-md" />
}
