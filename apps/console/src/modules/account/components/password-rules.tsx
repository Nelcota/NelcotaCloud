import { Check } from 'lucide-react'
import type { JSX } from 'react'

import { MIN_PASSWORD_LENGTH } from '@/modules/account/components/password-policy'
import { cn } from '@/shared/lib/utils'

type PasswordRulesProps = { id: string; password: string }

/** The password rule the server enforces, checked as the person types. */
export function PasswordRules({ id, password }: PasswordRulesProps): JSX.Element {
  const isLongEnough = password.length >= MIN_PASSWORD_LENGTH

  return (
    <p
      id={id}
      className={cn(
        'flex items-center gap-1.5 text-xs text-muted-foreground transition-colors',
        isLongEnough && 'text-success',
      )}
    >
      <Check
        aria-hidden
        className={cn('size-4 opacity-40 transition-opacity', isLongEnough && 'opacity-100')}
      />
      {MIN_PASSWORD_LENGTH} caracteres ou mais
      <span className="sr-only">{ruleState(isLongEnough)}</span>
    </p>
  )
}

function ruleState(isLongEnough: boolean): string {
  if (isLongEnough) {
    return '(atendido)'
  }

  return '(pendente)'
}
