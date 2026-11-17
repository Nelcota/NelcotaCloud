import { isConfirmationMissing } from '@/shared/lib/confirmation-text'
import type { ConfirmChange } from '@/shared/ui/confirm-change'
import type { ConfirmDialogProps } from '@/shared/ui/confirm-dialog'

/** The typed confirmation or a required value is still missing. */
export function isBlocked(props: ConfirmDialogProps, typedText: string): boolean {
  return props.canConfirm === false || isConfirmationMissing(props.confirmationText, typedText)
}

/** Destructive confirmations are announced as alerts, so a screen reader stops on them first. */
export function dialogRole(props: ConfirmDialogProps): 'alertdialog' | 'dialog' {
  if (props.isDestructive === true) {
    return 'alertdialog'
  }

  return 'dialog'
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

export function confirmVariant(props: ConfirmDialogProps): 'destructive' | 'secondary' | 'default' {
  if (props.isDestructive === true) {
    return 'destructive'
  }

  if (props.isWeighty === true) {
    return 'secondary'
  }

  return 'default'
}
