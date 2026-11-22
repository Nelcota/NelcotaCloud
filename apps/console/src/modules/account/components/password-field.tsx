import { Eye, EyeOff } from 'lucide-react'
import {
  type ChangeEvent,
  type JSX,
  type KeyboardEvent,
  type ReactNode,
  useId,
  useState,
} from 'react'

import { FieldLabel } from '@/shared/ui/primitives/field'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/shared/ui/primitives/input-group'

type PasswordFieldProps = {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  /** A link at the end of the label row, such as "Esqueci minha senha". */
  labelAction?: ReactNode
  /** Rules or hints under the field; their element gets this id for `aria-describedby`. */
  describedById?: string
}

/** A password input that can be shown while typing and warns when Caps Lock is on. */
export function PasswordField(props: PasswordFieldProps): JSX.Element {
  const id = useId()
  const [isVisible, setIsVisible] = useState(false)
  const [isCapsLockOn, setIsCapsLockOn] = useState(false)

  function readCapsLock(event: KeyboardEvent<HTMLInputElement>): void {
    setIsCapsLockOn(event.getModifierState('CapsLock'))
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <FieldLabel htmlFor={id}>{props.label}</FieldLabel>
        {props.labelAction}
      </div>
      <InputGroup className="h-10">
        <InputGroupInput
          id={id}
          type={inputType(isVisible)}
          name="password"
          required
          autoComplete={props.autoComplete}
          aria-describedby={props.describedById}
          value={props.value}
          onKeyUp={readCapsLock}
          onKeyDown={readCapsLock}
          onBlur={() => setIsCapsLockOn(false)}
          onChange={(event: ChangeEvent<HTMLInputElement>) => props.onChange(event.target.value)}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            aria-label={toggleLabel(isVisible)}
            aria-pressed={isVisible}
            onClick={() => setIsVisible((current) => current === false)}
          >
            <VisibilityIcon isVisible={isVisible} />
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <CapsLockNote isOn={isCapsLockOn} />
    </div>
  )
}

function inputType(isVisible: boolean): 'text' | 'password' {
  if (isVisible) {
    return 'text'
  }

  return 'password'
}

function toggleLabel(isVisible: boolean): string {
  if (isVisible) {
    return 'Esconder senha'
  }

  return 'Mostrar senha'
}

function VisibilityIcon({ isVisible }: { isVisible: boolean }): JSX.Element {
  if (isVisible) {
    return <EyeOff aria-hidden />
  }

  return <Eye aria-hidden />
}

function CapsLockNote({ isOn }: { isOn: boolean }): JSX.Element {
  return (
    <p role="status" className="text-xs text-warning">
      {capsLockText(isOn)}
    </p>
  )
}

function capsLockText(isOn: boolean): string {
  if (isOn) {
    return 'Caps Lock está ligado.'
  }

  return ''
}
