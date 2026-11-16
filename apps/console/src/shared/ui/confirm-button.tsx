import type { JSX, ReactNode } from 'react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type ConfirmButtonProps = {
  children: ReactNode
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  isDestructive?: boolean
  isPending?: boolean
}

/** A button whose action runs only after the user confirms it in a dialog. */
export function ConfirmButton(props: ConfirmButtonProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant={triggerVariant(props.isDestructive)}
        size="sm"
        disabled={props.isPending}
        aria-busy={props.isPending}
        onClick={() => setIsOpen(true)}
      >
        {props.children}
      </Button>
      <ConfirmDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={props.title}
        description={props.description}
        confirmLabel={props.confirmLabel}
        isDestructive={props.isDestructive}
        onConfirm={props.onConfirm}
      />
    </>
  )
}

function triggerVariant(isDestructive: boolean | undefined): 'destructive' | 'outline' {
  if (isDestructive === true) {
    return 'destructive'
  }

  return 'outline'
}
