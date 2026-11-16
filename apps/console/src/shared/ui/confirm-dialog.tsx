import type { JSX } from 'react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog'
import { FormField } from '@/shared/ui/form-field'

export type ConfirmDialogProps = {
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  isDestructive?: boolean
  /** Text the user must type before confirming, for actions that cannot be undone at all. */
  confirmationText?: string
}

/**
 * Asks before an action runs. Controlled, so a menu item can open it after the menu closes;
 * `ConfirmButton` wraps it for the common case of a plain button.
 */
export function ConfirmDialog(props: ConfirmDialogProps): JSX.Element {
  const [typedText, setTypedText] = useState('')

  function changeOpen(isOpen: boolean): void {
    setTypedText('')
    props.onOpenChange(isOpen)
  }

  function confirm(): void {
    changeOpen(false)
    props.onConfirm()
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={changeOpen}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <TypedConfirmation
          expected={props.confirmationText}
          value={typedText}
          onChange={setTypedText}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => changeOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant={confirmVariant(props.isDestructive)}
            disabled={isConfirmationMissing(props.confirmationText, typedText)}
            onClick={confirm}
          >
            {props.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type TypedConfirmationProps = {
  expected: string | undefined
  value: string
  onChange: (value: string) => void
}

function TypedConfirmation({
  expected,
  value,
  onChange,
}: TypedConfirmationProps): JSX.Element | null {
  if (expected === undefined) {
    return null
  }

  return (
    <FormField
      label={`Digite ${expected} para confirmar`}
      autoFocus
      value={value}
      autoComplete="off"
      spellCheck={false}
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

function isConfirmationMissing(expected: string | undefined, typedText: string): boolean {
  if (expected === undefined) {
    return false
  }

  return typedText.trim() !== expected
}

function confirmVariant(isDestructive: boolean | undefined): 'destructive' | 'default' {
  if (isDestructive === true) {
    return 'destructive'
  }

  return 'default'
}
