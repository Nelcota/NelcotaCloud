import type { JSX } from 'react'

import { LogoMark } from '@/shared/ui/logo-mark'

/** The product mark and name, on pages outside the signed-in shell. */
export function ConsoleBrand(): JSX.Element {
  return (
    <span className="inline-flex items-center gap-2 text-sm font-semibold text-heading">
      <LogoMark size={24} />
      NelcotaCloud
    </span>
  )
}
