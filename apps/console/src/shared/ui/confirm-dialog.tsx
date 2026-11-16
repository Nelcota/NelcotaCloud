import type { JSX } from 'react'

import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'

const SOLID_DESTRUCTIVE =
  'bg-destructive text-white hover:bg-destructive/90 dark:bg-destructive dark:hover:bg-destructive/90'

export type ConfirmDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  isDestructive?: boolean
}

/**
 * Asks before an action runs. Controlled, so a menu item can open it after the menu closes;
 * `ConfirmButton` wraps it for the common case of a plain button.
 */
export function ConfirmDialog(props: ConfirmDialogProps): JSX.Element {
  const variant = confirmVariant(props.isDestructive)

  function confirm(): void {
    props.onOpenChange(false)
    props.onConfirm()
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={props.onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => props.onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant={variant} className={confirmClass(props.isDestructive)} onClick={confirm}>
            {props.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The dialog's main action is solid: it must stand out more than the button that opened it. */
function confirmClass(isDestructive: boolean | undefined): string | undefined {
  if (isDestructive === true) {
    return SOLID_DESTRUCTIVE
  }

  return undefined
}

function confirmVariant(isDestructive: boolean | undefined): 'destructive' | 'default' {
  if (isDestructive === true) {
    return 'destructive'
  }

  return 'default'
}
