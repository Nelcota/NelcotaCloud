import type { JSX } from 'react'

import { Kbd } from '@/shared/ui/primitives/kbd'

/** How to move through the list, as the panel shows shortcuts: keys in `kbd`. */
export function PaletteFooter(): JSX.Element {
  return (
    <div className="flex items-center gap-3 border-t border-border/60 px-3 py-2 text-2xs text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Kbd>↑</Kbd>
        <Kbd>↓</Kbd>
        navegar
      </span>
      <span className="inline-flex items-center gap-1">
        <Kbd>↵</Kbd>
        abrir
      </span>
      <span className="inline-flex items-center gap-1">
        <Kbd>esc</Kbd>
        fechar
      </span>
    </div>
  )
}
