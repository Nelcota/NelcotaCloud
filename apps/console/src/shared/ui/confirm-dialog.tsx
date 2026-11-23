import type { FormEvent, JSX, ReactNode } from 'react'
import { useId, useState } from 'react'

import { useReadOnlyReason } from '@/shared/auth/write-access'
import type { ConfirmChange } from '@/shared/ui/confirm-change'
import { ConfirmChangeList } from '@/shared/ui/confirm-change-list'
import {
  confirmVariant,
  dialogPurpose,
  isBlocked,
  missingOf,
} from '@/shared/ui/confirm-dialog-rules'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { missingNoteReference } from '@/shared/lib/missing-unless'
import { MissingNote } from '@/shared/ui/missing-note'
import { PendingButton } from '@/shared/ui/pending-button'
import { Button } from '@/shared/ui/primitives/button'
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog'
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
  /** Weighty but not destructive (handing a project over): the confirm button stays neutral. */
  isWeighty?: boolean
  /** Text the user must type before confirming, for actions that cannot be undone at all. */
  confirmationText?: string
  /** What the action changes, each shown going from its current state to the new one. */
  change?: ConfirmChange | ConfirmChange[]
  /**
   * What the action still needs ("Digite o código"), shown beside the waiting button; `null`
   * or absent once it can run.
   */
  missing?: string | null
  /** Extra choices that shape the action, shown under the change. */
  children?: ReactNode
  /** Wider for dialogs that hold a form; `md` by default. */
  size?: 'md' | 'lg' | 'xl'
}

const SIZES = { md: 'sm:max-w-md', lg: 'sm:max-w-xl', xl: 'sm:max-w-3xl' }

/**
 * Asks before an action runs. Controlled, so a menu item can open it after the menu closes;
 * `ConfirmButton` wraps it for the common case of a plain button.
 */
export function ConfirmDialog(dialogProps: ConfirmDialogProps): JSX.Element {
  // A viewer's confirmation waits on the same note as a missing value: the API would refuse it.
  const readOnlyReason = useReadOnlyReason()
  const props = { ...dialogProps, missing: readOnlyReason ?? dialogProps.missing }
  const [typedText, setTypedText] = useState('')
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const missingId = useId()
  const missing = missingOf(props)

  function changeOpen(isOpen: boolean): void {
    if (isWorking) {
      return
    }

    setTypedText('')
    setError(null)
    notifyOpen(props, isOpen)
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    // The dialog is portaled, but React still bubbles its submit to a form around the trigger.
    event.stopPropagation()

    if (isBlocked(props, typedText) || isWorking) {
      return
    }

    await confirm()
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
      setTypedText('')
      notifyOpen(props, false)
    } catch (failure) {
      setIsWorking(false)
      setError(failure)
    }
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={changeOpen}>
      <DialogContent
        className={SIZES[props.size ?? 'md']}
        onPointerDownOutside={(event) => {
          if (dialogPurpose(props) === 'form') {
            event.preventDefault()
          }
        }}
      >
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{props.title}</DialogTitle>
            <DialogDescription>{props.description}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <ConfirmChangeList change={props.change} />
            {props.children}
            <TypedConfirmation
              expected={props.confirmationText}
              value={typedText}
              onChange={setTypedText}
            />
            <ErrorAlert error={error} />
          </DialogBody>
          <DialogFooter>
            <MissingNote id={missingId} missing={missing} />
            <Button
              type="button"
              variant="outline"
              disabled={isWorking}
              onClick={() => changeOpen(false)}
            >
              {props.cancelLabel ?? 'Cancelar'}
            </Button>
            <PendingButton
              type="submit"
              variant={confirmVariant(props)}
              isPending={isWorking}
              disabled={isBlocked(props, typedText)}
              aria-describedby={missingNoteReference(missingId, missing)}
            >
              {props.confirmLabel}
            </PendingButton>
          </DialogFooter>
        </form>
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
