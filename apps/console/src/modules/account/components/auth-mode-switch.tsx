import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'

export type AuthMode = 'sign-in' | 'sign-up'

const MODES: readonly { value: AuthMode; label: string }[] = [
  { value: 'sign-in', label: 'Entrar' },
  { value: 'sign-up', label: 'Criar conta' },
]

type AuthModeSwitchProps = { mode: AuthMode; onModeChange: (mode: AuthMode) => void }

/** Signing in and creating an account are two halves of one control, always in view. */
export function AuthModeSwitch({ mode, onModeChange }: AuthModeSwitchProps): JSX.Element {
  return (
    <div
      role="group"
      aria-label="Acesso"
      className="grid grid-cols-2 gap-1 rounded-lg bg-surface p-1"
    >
      {MODES.map((option) => {
        const isCurrent = option.value === mode

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isCurrent}
            onClick={() => onModeChange(option.value)}
            className={cn(
              'h-8 rounded-md text-sm text-muted-foreground hover:text-foreground',
              isCurrent && 'bg-background font-medium text-foreground shadow-popover',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
