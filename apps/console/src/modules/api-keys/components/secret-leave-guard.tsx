import { useBlocker } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

/**
 * Asks before leaving a page that shows a key the API will never return again, both for
 * navigation inside the console and for closing or reloading the tab.
 */
export function SecretLeaveGuard({ isActive }: { isActive: boolean }): JSX.Element {
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
      title="Sair sem copiar a chave?"
      description="Ela não aparece de novo. Se sair sem guardá-la, vai precisar criar outra chave e revogar esta."
      confirmLabel="Sair mesmo assim"
      isDestructive
      onConfirm={() => blocker.proceed?.()}
    />
  )
}
