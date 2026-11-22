import type { JSX } from 'react'
import { useState } from 'react'

import type { ConfirmChange } from '@/shared/ui/confirm-change'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import type { IconComponent } from '@/shared/ui/icon-component'
import { PendingButton } from '@/shared/ui/pending-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip'

type ConfirmButtonProps = {
  /** The button's text. */
  label: string
  icon?: IconComponent
  /** Shows only the icon, with `label` as its accessible name and tooltip. */
  isIconOnly?: boolean
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void | Promise<void>
  isDestructive?: boolean
  /** Solid red instead of red outline, for the one action of a page that destroys everything. */
  isSolid?: boolean
  isDisabled?: boolean
  isPending?: boolean
  /** See `ConfirmDialog`: text to type before an irreversible action. */
  confirmationText?: string
  /** See `ConfirmDialog`: the change the action makes. */
  change?: ConfirmChange
  /** See `ConfirmDialog`; rename "Cancelar" when the action itself is a cancellation. */
  cancelLabel?: string
  /** Small by default, to sit in rows and section footers. */
  size?: 'sm' | 'md'
}

/** A button whose action runs only after the user confirms it in a dialog. */
export function ConfirmButton(props: ConfirmButtonProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Trigger props={props} onOpen={() => setIsOpen(true)} />
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
        onConfirm={props.onConfirm}
      />
    </>
  )
}

function Trigger({
  props,
  onOpen,
}: {
  props: ConfirmButtonProps
  onOpen: () => void
}): JSX.Element {
  const Glyph = props.icon
  const variant = triggerVariant(props)
  const glyph = Glyph === undefined ? null : <Glyph aria-hidden data-icon="inline-start" />

  if (props.isIconOnly === true) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <PendingButton
            type="button"
            variant={iconVariant(props)}
            size="icon-sm"
            aria-label={props.label}
            disabled={props.isDisabled}
            isPending={props.isPending}
            onClick={onOpen}
          >
            {glyph}
          </PendingButton>
        </TooltipTrigger>
        <TooltipContent>{props.label}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <PendingButton
      type="button"
      variant={variant}
      size={props.size === 'md' ? 'default' : 'sm'}
      disabled={props.isDisabled}
      isPending={props.isPending}
      onClick={onOpen}
    >
      {glyph}
      {props.label}
    </PendingButton>
  )
}

/** Icon-only triggers sit in rows: no fill, but a destructive one is still red. */
function iconVariant(props: ConfirmButtonProps): 'destructive-ghost' | 'ghost' {
  if (props.isDestructive === true) {
    return 'destructive-ghost'
  }

  return 'ghost'
}

type TriggerVariant = 'destructive-solid' | 'destructive' | 'outline'

function triggerVariant(props: ConfirmButtonProps): TriggerVariant {
  if (props.isDestructive !== true) {
    return 'outline'
  }

  if (props.isSolid === true) {
    return 'destructive-solid'
  }

  return 'destructive'
}
