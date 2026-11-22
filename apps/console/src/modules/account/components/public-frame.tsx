import type { JSX, ReactNode } from 'react'

import { AuthPanel } from '@/modules/account/components/auth-panel'
import { cn } from '@/shared/lib/utils'
import { ConsoleBrand } from '@/shared/ui/console-brand'

const WIDTHS = { sm: 'max-w-[22.5rem]', md: 'max-w-lg' }

type PublicFrameProps = {
  children: ReactNode
  /** `sm` for one form (email links), `md` for messages that carry a report. */
  size?: keyof typeof WIDTHS
}

/** A page outside the signed-in shell: the brand above one panel on the frame. */
export function PublicFrame({ children, size = 'sm' }: PublicFrameProps): JSX.Element {
  return (
    <main
      aria-label="Conteúdo"
      className="flex min-h-dvh flex-col items-center justify-center bg-frame px-4 py-10"
    >
      <div className={cn('flex w-full flex-col gap-4', WIDTHS[size])}>
        <div className="px-1">
          <ConsoleBrand />
        </div>
        <AuthPanel>{children}</AuthPanel>
      </div>
    </main>
  )
}
