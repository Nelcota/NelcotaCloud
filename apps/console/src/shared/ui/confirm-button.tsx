import type { JSX, ReactNode } from 'react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import type { ConfirmChange } from '@/shared/ui/confirm-change'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'

type ConfirmButtonProps = {
  children: ReactNode
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  isDestructive?: boolean
  isPending?: boolean
  /** See `ConfirmDialog`: text to type before an irreversible action. */
  confirmationText?: string
  /** See `ConfirmDialog`: the change the action makes, played when the dialog opens. */
  change?: ConfirmChange
  /** See `ConfirmDialog`: what will happen, as a picture. */
  illustration?: ReactNode
  /** See `ConfirmDialog`; rename "Cancelar" when the action itself is a cancellation. */
  cancelLabel?: string
  /** The button's accessible name, when its visible text is shortened (an icon on phones). */
  triggerLabel?: string
  /** Small by default, to sit in rows and section footers. */
  size?: 'sm' | 'default'
}

/** A button whose action runs only after the user confirms it in a dialog. */
export function ConfirmButton(props: ConfirmButtonProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button
        variant={triggerVariant(props.isDestructive)}
        size={props.size ?? 'sm'}
        disabled={props.isPending}
        aria-busy={props.isPending}
        aria-label={props.triggerLabel}
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
        confirmationText={props.confirmationText}
        change={props.change}
        cancelLabel={props.cancelLabel}
        illustration={props.illustration}
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
