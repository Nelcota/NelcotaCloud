import type { JSX, ReactNode } from 'react'
import { useState } from 'react'

import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'

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
  const variant = variantFor(props.isDestructive)

  function confirm(): void {
    setIsOpen(false)
    props.onConfirm()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger
        render={
          <Button
            variant={variant}
            size="sm"
            disabled={props.isPending}
            aria-busy={props.isPending}
          />
        }
      >
        {props.children}
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{props.title}</DialogTitle>
          <DialogDescription>{props.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancelar
          </Button>
          <Button variant={variant} onClick={confirm}>
            {props.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function variantFor(isDestructive: boolean | undefined): 'destructive' | 'outline' {
  if (isDestructive === true) {
    return 'destructive'
  }

  return 'outline'
}
