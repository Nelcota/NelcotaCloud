import { ArrowLeft } from 'lucide-react'
import type { JSX } from 'react'

import { Button } from '@/shared/ui/primitives/button'

/** The way out of the code, recovery and notice steps, back to the sign-in form. */
export function AuthBackButton({ onBack }: { onBack: () => void }): JSX.Element {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-fit px-2 text-muted-foreground"
      onClick={onBack}
    >
      <ArrowLeft aria-hidden data-icon="inline-start" />
      Voltar para o login
    </Button>
  )
}
