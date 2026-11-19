import Eye from '~icons/solar/eye-linear'
import EyeClosed from '~icons/solar/eye-closed-linear'
import type { ComponentProps, JSX, KeyboardEvent, ReactNode } from 'react'
import { useId, useState } from 'react'

import { cn } from '@/shared/lib/class-names'
import { fieldIconPadding } from '@/shared/lib/field-icon-padding'
import { visibleHint } from '@/shared/lib/visible-hint'
import { FieldIcon } from '@/shared/ui/field-icon'
import type { IconComponent } from '@/shared/ui/icon-component'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Label } from '@/shared/ui/label'
import { useFieldError } from '@/shared/ui/use-field-error'

type PasswordFieldProps = Omit<ComponentProps<typeof Input>, 'type' | 'onKeyDown' | 'onBlur'> & {
  label: string
  hint?: string
  /** A small action on the label's line, such as the way to recover a forgotten password. */
  labelAction?: ReactNode
  /** An icon at the start of the input. */
  icon?: IconComponent
}

/**
 * A labelled password input that can show what was typed and warns while Caps Lock is on: the
 * two usual reasons a correct password is rejected. The label action sits on the label's line
 * but comes after the input in the DOM, so Tab reaches the password before it.
 */
export function PasswordField(props: PasswordFieldProps): JSX.Element {
  const { label, hint, labelAction, icon, ...inputProps } = props
  const id = useId()
  const notesId = `${id}-notes`
  const [isVisible, setIsVisible] = useState(false)
  const [isCapsLockOn, setIsCapsLockOn] = useState(false)
  const fieldError = useFieldError()

  function readCapsLock(event: KeyboardEvent<HTMLInputElement>): void {
    setIsCapsLockOn(event.getModifierState('CapsLock'))
  }

  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1.5">
      <Label htmlFor={id} className="col-start-1 row-start-1">
        {label}
      </Label>
      <div className="relative col-span-2 row-start-2">
        <FieldIcon icon={icon} />
        <Input
          id={id}
          type={inputType(isVisible)}
          aria-describedby={notesId}
          className={cn('pr-12', fieldIconPadding(icon))}
          onKeyDown={readCapsLock}
          onBlur={() => setIsCapsLockOn(false)}
          aria-invalid={fieldError.message !== '' || undefined}
          onInvalid={fieldError.onInvalid}
          onInput={fieldError.onInput}
          {...inputProps}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="absolute top-1/2 right-0.5 -translate-y-1/2"
          aria-label={visibilityLabel(isVisible)}
          aria-pressed={isVisible}
          onClick={() => setIsVisible(isVisible === false)}
        >
          <VisibilityIcon isVisible={isVisible} />
        </Button>
      </div>
      <div className="col-start-2 row-start-1 justify-self-end">{labelAction}</div>
      <div
        id={notesId}
        data-slot="field-hint"
        aria-live="polite"
        className="text-muted-foreground col-span-2 row-start-3 grid gap-0.5 text-xs"
      >
        <ErrorNote message={fieldError.message} />
        <CapsLockNote isCapsLockOn={isCapsLockOn} />
        <Hint hint={visibleHint(hint, fieldError.message)} />
      </div>
    </div>
  )
}

function inputType(isVisible: boolean): string {
  if (isVisible) {
    return 'text'
  }

  return 'password'
}

function visibilityLabel(isVisible: boolean): string {
  if (isVisible) {
    return 'Esconder senha'
  }

  return 'Mostrar senha'
}

function VisibilityIcon({ isVisible }: { isVisible: boolean }): JSX.Element {
  if (isVisible) {
    return <EyeClosed aria-hidden="true" />
  }

  return <Eye aria-hidden="true" />
}

function CapsLockNote({ isCapsLockOn }: { isCapsLockOn: boolean }): JSX.Element | null {
  if (isCapsLockOn === false) {
    return null
  }

  return <p className="font-medium text-amber-700 dark:text-amber-400">Caps Lock está ativado.</p>
}

function Hint({ hint }: { hint?: string }): JSX.Element | null {
  if (hint === undefined) {
    return null
  }

  return <p>{hint}</p>
}

function ErrorNote({ message }: { message: string }): JSX.Element | null {
  if (message === '') {
    return null
  }

  return <p className="text-destructive">{message}</p>
}
