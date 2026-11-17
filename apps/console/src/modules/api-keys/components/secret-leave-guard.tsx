import Key from '~icons/solar/key-linear'
import { useBlocker } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type SecretLeaveGuardProps = {
  isActive: boolean
  /** What is shown only once, as the dialog names it (e.g. "Secret key nova"). */
  subject: string
}

/**
 * Asks before leaving a page that shows a secret the API will never return again, both for
 * navigation inside the console and for closing or reloading the tab.
 */
export function SecretLeaveGuard({ isActive, subject }: SecretLeaveGuardProps): JSX.Element {
  const blocker = useBlocker({
    shouldBlockFn: () => isActive,
    enableBeforeUnload: () => isActive,
    withResolver: true,
  })

  function changeOpen(isOpen: boolean): void {
    if (isOpen) {
      return
    }

    blocker.reset?.()
  }

  return (
    <ConfirmDialog
      isOpen={blocker.status === 'blocked'}
      onOpenChange={changeOpen}
      title={`Sair sem copiar: ${subject.toLowerCase()}?`}
      description="Não aparece de novo. Se sair sem guardar, vai precisar gerar outro e descartar este."
      confirmLabel="Sair mesmo assim"
      change={{ subject, icon: Key, from: 'Visível', to: 'Nunca mais exibida' }}
      isDestructive
      onConfirm={() => blocker.proceed?.()}
    />
  )
}
