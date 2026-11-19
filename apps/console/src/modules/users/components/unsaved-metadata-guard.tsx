import Code from '~icons/solar/code-linear'
import { useBlocker } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

/**
 * Asks before leaving the user's page with metadata edits not yet saved, for navigation inside
 * the console and for closing or reloading the tab. Switching tabs on the page keeps the draft,
 * so it is not blocked.
 */
export function UnsavedMetadataGuard({ hasEdits }: { hasEdits: boolean }): JSX.Element {
  const blocker = useBlocker({
    shouldBlockFn: ({ current, next }) => hasEdits && current.pathname !== next.pathname,
    enableBeforeUnload: () => hasEdits,
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
      title="Descartar as alterações nos metadados?"
      description="Elas ainda não foram salvas e se perdem ao sair desta página."
      confirmLabel="Descartar e sair"
      change={{ subject: 'Metadados', icon: Code, from: 'Editados', to: 'Descartados' }}
      isDestructive
      onConfirm={() => blocker.proceed?.()}
    />
  )
}
