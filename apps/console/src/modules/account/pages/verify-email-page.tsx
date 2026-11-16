import { useQuery } from '@tanstack/react-query'
import { Link, useSearch } from '@tanstack/react-router'
import type { JSX } from 'react'

import { nelcota } from '@/shared/auth/nelcota'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { ErrorAlert } from '@/shared/ui/error-alert'

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

  return (
    <div>
      <Card>
        <CardHeader>
          <CardTitle>Confirmação de email</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm">
          <VerificationStatus
            hasToken={token !== ''}
            isPending={verification.isPending}
            error={verification.error}
          />
          <Link to="/login" className="underline underline-offset-4">
            Ir para o login
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

function VerificationStatus({
  hasToken,
  isPending,
  error,
}: {
  hasToken: boolean
  isPending: boolean
  error: unknown
}): JSX.Element {
  if (hasToken === false) {
    return <p>Este link de confirmação está incompleto. Abra de novo o link do email.</p>
  }

  if (isPending) {
    return <p aria-busy="true">Confirmando…</p>
  }

  if (error !== null) {
    return <ErrorAlert error={error} />
  }

  return <p>Email confirmado. Você já pode entrar.</p>
}
