import { Link } from '@tanstack/react-router'
import CircleCheck from '~icons/solar/check-circle-linear'
import CircleX from '~icons/solar/close-circle-linear'
import LoaderCircle from '~icons/solar/refresh-linear'
import type { IconComponent } from '@/shared/ui/icon-component'
import type { JSX } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { useVerifyEmailQuery } from '@/modules/account/queries/use-verify-email-query'
import { cn } from '@/shared/lib/class-names'
import { buttonVariants } from '@/shared/ui/button-variants'
import { ErrorAlert } from '@/shared/ui/error-alert'

type VerificationState = 'incomplete' | 'pending' | 'failed' | 'verified'

const STATES: Record<
  VerificationState,
  { title: string; description: string; icon: IconComponent; iconClass: string }
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

/** Confirms the email with the link's one-time token and shows how it went. */
export function EmailVerificationCard({ token }: { token: string }): JSX.Element {
  const verification = useVerifyEmailQuery(token)
  const state = verificationState(token, verification.isPending, verification.error)
  const content = STATES[state]
  const Icon = content.icon

  return (
    <AuthCard
      title={content.title}
      description={content.description}
      icon={<Icon aria-hidden="true" className={cn('mb-4 size-10', content.iconClass)} />}
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
