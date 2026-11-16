import { useQuery } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import { CircleCheck, CircleX, LoaderCircle, type LucideIcon } from 'lucide-react'
import type { JSX } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { nelcota } from '@/shared/auth/nelcota'
import { cn } from '@/shared/lib/class-names'
import { buttonVariants } from '@/shared/ui/button-variants'
import { ErrorAlert } from '@/shared/ui/error-alert'

type VerificationState = 'incomplete' | 'pending' | 'failed' | 'verified'

const STATES: Record<
  VerificationState,
  { title: string; description: string; icon: LucideIcon; iconClass: string }
> = {
  incomplete: {
    title: 'Link incompleto',
    description: 'Este link de confirmação está cortado. Abra de novo o link do email.',
    icon: CircleX,
    iconClass: 'text-destructive',
  },
  pending: {
    title: 'Confirmando seu email',
    description: 'Só um instante.',
    icon: LoaderCircle,
    iconClass: 'text-muted-foreground motion-safe:animate-spin',
  },
  failed: {
    title: 'Não deu para confirmar',
    description: 'O link pode ter expirado ou já ter sido usado.',
    icon: CircleX,
    iconClass: 'text-destructive',
  },
  verified: {
    title: 'Email confirmado',
    description: 'Tudo certo. Você já pode entrar.',
    icon: CircleCheck,
    iconClass: 'text-emerald-500',
  },
}

/** Opened from the confirmation email: `/auth/verify-email?token=…`. */
export function VerifyEmailPage(): JSX.Element {
  const { token } = useSearch({ from: '/_public/auth/verify-email' })
  const verification = useQuery({
    queryKey: ['account', 'verify-email', token],
    queryFn: () => nelcota.auth.verifyEmail({ token: token }),
    retry: false,
    // A link without a token cannot be valid; no need to ask the API.
    enabled: token !== '',
  })
  const state = verificationState(token, verification.isPending, verification.error)
  const content = STATES[state]
  const Icon = content.icon

  return (
    <AuthCard
      title={content.title}
      description={content.description}
      icon={
        <Icon
          aria-hidden="true"
          className={cn('mb-4 size-10', content.iconClass)}
          strokeWidth={1.5}
        />
      }
    >
      <ErrorAlert error={verification.error} />
      <Link to="/login" className={buttonVariants({ size: 'lg' })}>
        Ir para o login
      </Link>
    </AuthCard>
  )
}

function verificationState(token: string, isPending: boolean, error: unknown): VerificationState {
  if (token === '') {
    return 'incomplete'
  }

  if (isPending) {
    return 'pending'
  }

  if (error !== null) {
    return 'failed'
  }

  return 'verified'
}
