import type { JSX, ReactNode } from 'react'

import { ConsoleBrand } from '@/shared/ui/console-brand'
import { FlashNotice } from '@/shared/ui/flash-notice'

type AuthScreenProps = {
  /** The form column: heading, mode switch and the current step. */
  children: ReactNode
  /** What the product is, beside the form on wide screens. */
  showcase: ReactNode
}

/**
 * The sign-in page: one rounded panel with the form on the black frame and, from `lg` up, the
 * product beside it, like the console it opens.
 */
export function AuthScreen({ children, showcase }: AuthScreenProps): JSX.Element {
  return (
    <div className="grid min-h-dvh bg-frame p-2 lg:grid-cols-[minmax(0,32rem)_minmax(0,1fr)] lg:gap-2">
      <div className="flex min-w-0 flex-col rounded-2xl bg-background">
        <header className="flex h-16 items-center px-6 sm:px-10">
          <ConsoleBrand />
        </header>
        <main className="flex flex-1 flex-col justify-center px-6 py-8 sm:px-10">
          <div className="mx-auto flex w-full max-w-[24rem] animate-page-in flex-col gap-6">
            <FlashNotice />
            {children}
          </div>
        </main>
        <footer className="px-6 py-5 text-2xs text-pretty text-muted-foreground sm:px-10">
          Ao continuar, você concorda com os termos de uso da plataforma.
        </footer>
      </div>
      {showcase}
    </div>
  )
}
