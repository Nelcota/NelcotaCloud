import type { JSX, ReactNode } from 'react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import { type ConfirmChange, ConfirmChangePreview } from '@/shared/ui/confirm-change'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { isConfirmationMissing } from '@/shared/lib/confirmation-text'
import { TypedConfirmation } from '@/shared/ui/typed-confirmation'

export type ConfirmDialogProps = {
  isOpen: boolean
  onOpenChange?: (isOpen: boolean) => void
  /** Called whenever the dialog closes (cancelled, dismissed or confirmed). */
  onClose?: () => void
  title: string
  description: string
  confirmLabel: string
  /**
   * A promise keeps the dialog open and busy until it settles: it closes on success and shows
   * the error inside itself on failure, next to the decision that caused it.
   */
  onConfirm: () => void | Promise<void>
  /** "Cancelar" by default; rename it when the action itself is a cancellation. */
  cancelLabel?: string
  isDestructive?: boolean
  /**
   * Weighty but not destructive (handing a project over): the confirm button is neutral, so
   * it does not read as the routine blue "go ahead".
   */
  isWeighty?: boolean
  /** Text the user must type before confirming, for actions that cannot be undone at all. */
  confirmationText?: string
  /** What the action changes, each shown going from its current state to the new one. */
  change?: ConfirmChange | ConfirmChange[]
  /** Extra choices that shape the action, shown under the change. */
  children?: ReactNode
}

/**
 * Asks before an action runs. Controlled, so a menu item can open it after the menu closes;
 * `ConfirmButton` wraps it for the common case of a plain button.
 */
export function ConfirmDialog(props: ConfirmDialogProps): JSX.Element {
  const [typedText, setTypedText] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<unknown>(null)

  function changeOpen(isOpen: boolean): void {
    if (isWorking) {
      return
    }

    setTypedText('')
    setError(null)
    notifyOpen(props, isOpen)
  }

  async function confirm(): Promise<void> {
    const result = props.onConfirm()

    if (result instanceof Promise === false) {
      changeOpen(false)
      return
    }

    setIsWorking(true)
    setError(null)

    try {
      await result
      setIsWorking(false)
      notifyOpen(props, false)
    } catch (failure) {
      setIsWorking(false)
      setError(failure)
    }
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={changeOpen}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          {changesOf(props.change).map((change) => (
            <ConfirmChangePreview
              key={change.subject}
              change={change}
              isDestructive={props.isDestructive === true}
            />
          ))}
        </div>
        {props.children}
        <TypedConfirmation
          expected={props.confirmationText}
          value={typedText}
          onChange={setTypedText}
        />
        <ErrorAlert error={error} />
        <DialogFooter>
          <Button variant="outline" disabled={isWorking} onClick={() => changeOpen(false)}>
            {props.cancelLabel ?? 'Cancelar'}
          </Button>
          <Button
            variant={confirmVariant(props)}
            disabled={isWorking || isConfirmationMissing(props.confirmationText, typedText)}
            aria-busy={isWorking}
            className="aria-busy:cursor-progress"
            onClick={confirm}
          >
            {props.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function notifyOpen(props: ConfirmDialogProps, isOpen: boolean): void {
  props.onOpenChange?.(isOpen)

  if (isOpen) {
    return
  }

  props.onClose?.()
}

function changesOf(change: ConfirmDialogProps['change']): ConfirmChange[] {
  if (change === undefined) {
    return []
  }

  if (Array.isArray(change)) {
    return change
  }

  return [change]
}

function confirmVariant(props: ConfirmDialogProps): 'destructive' | 'secondary' | 'default' {
  if (props.isDestructive === true) {
    return 'destructive'
  }

  if (props.isWeighty === true) {
    return 'secondary'
  }

  return 'default'
}
