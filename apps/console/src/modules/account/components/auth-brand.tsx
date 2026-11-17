import type { JSX } from 'react'

/**
 * The mark and the name at the top of the auth card. The logo file is white: it shows as is
 * in the dark theme and is inverted to black in the light one, so it needs no tile here.
 */
export function AuthBrand(): JSX.Element {
  return (
    <div className="mb-8 flex items-center gap-3">
      <img
        src="/nelcota-logo.png"
        alt=""
        width={256}
        height={256}
        className="size-12 invert dark:invert-0"
      />
      <span className="text-2xl font-semibold tracking-tight">NelcotaCloud</span>
    </div>
  )
}
