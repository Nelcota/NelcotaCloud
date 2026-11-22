import { isConfirmationMissing } from '@/shared/lib/confirmation-text'
import type { ConfirmChange } from '@/shared/ui/confirm-change'
import type { ConfirmDialogProps } from '@/shared/ui/confirm-dialog'

/** The typed confirmation or a required value is still missing. */
export function isBlocked(props: ConfirmDialogProps, typedText: string): boolean {
  return props.canConfirm === false || isConfirmationMissing(props.confirmationText, typedText)
}

export function changesOf(change: ConfirmDialogProps['change']): ConfirmChange[] {
  if (change === undefined) {
    return []
  }

  if (Array.isArray(change)) {
    return change
  }

  return [change]
}

/** Destructive actions are red; weighty ones (handing a project over) stay neutral. */
export function confirmVariant(props: ConfirmDialogProps): 'destructive' | 'outline' | 'default' {
  if (props.isDestructive === true) {
    return 'destructive'
  }

  if (props.isWeighty === true) {
    return 'outline'
  }

  return 'default'
}

/** Destructive dialogs cannot be dismissed by a stray click outside them. */
export function dialogPurpose(props: ConfirmDialogProps): 'form' | 'info' {
  if (props.isDestructive === true || props.confirmationText !== undefined) {
    return 'form'
  }

  return 'info'
}
