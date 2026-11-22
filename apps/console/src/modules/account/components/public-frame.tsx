import type { JSX, ReactNode } from 'react'

import { cn } from '@/shared/lib/utils'
import { ConsoleBrand } from '@/shared/ui/console-brand'

const WIDTHS = { sm: 'max-w-md', md: 'max-w-xl' }

type PublicFrameProps = {
  children: ReactNode
  /** `sm` for one form (email links), `md` for messages that carry a report. */
  size?: keyof typeof WIDTHS
}

/** A page outside the signed-in shell: the brand above one centered card on the black frame. */
export function PublicFrame({ children, size = 'sm' }: PublicFrameProps): JSX.Element {
  return (
    <main
      aria-label="Conteúdo"
      className="flex min-h-dvh flex-col items-center justify-center bg-frame px-4 py-10"
    >
      <div className={cn('flex w-full flex-col gap-5', WIDTHS[size])}>
        <div className="flex justify-center">
          <ConsoleBrand />
        </div>
        <div className="rounded-xl border bg-background p-6 sm:p-8">{children}</div>
      </div>
    </main>
  )
}
