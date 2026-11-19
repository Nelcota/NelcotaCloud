import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import { AuthCard } from '@/modules/account/components/auth-card'
import { BackToLoginLink } from '@/modules/account/components/back-to-login-link'
import { SignInOutcome, SigningIn } from '@/modules/account/components/sign-in-outcome'
import { AUTH_MARKS } from '@/modules/account/model/auth-marks'
import { BROKEN_LINK } from '@/modules/account/model/broken-link'
import { useMagicLinkQuery } from '@/modules/account/queries/use-magic-link'
import { buttonVariants } from '@/shared/ui/button-variants'
import type { StatusMark } from '@/shared/ui/status-icon'
import { clearTokenFromLocation, tokenFromLocation } from '@/shared/routing/token-search'

/** Opened from the login-link email with its one-time token in the URL fragment. */
export function MagicLinkPage(): JSX.Element {
  const [token] = useState(tokenFromLocation)
  const login = useMagicLinkQuery(token)

  useEffect(() => {
    clearTokenFromLocation()
  }, [])

  if (token === '') {
    return <LinkProblem title={BROKEN_LINK.title} description={BROKEN_LINK.description} isBroken />
  }

  if (login.error !== null) {
    return (
      <LinkProblem
        title="Não deu para entrar"
        description="O link já foi usado ou expirou. Peça um novo."
      />
    )
  }

  if (login.data === undefined) {
    return <SigningIn />
  }

  return <SignInOutcome result={login.data} />
}

type LinkProblemProps = {
  title: string
  description: string
  /** A link without its code, rather than one the API refused. */
  isBroken?: boolean
}

function LinkProblem({ title, description, isBroken }: LinkProblemProps): JSX.Element {
  return (
    <AuthCard
      title={title}
      tabTitle="Link de acesso"
      description={description}
      mark={problemMark(isBroken)}
      footer={<BackToLoginLink />}
    >
      <Link to="/login" search={{ etapa: 'link' }} className={buttonVariants({ size: 'lg' })}>
        Pedir novo link
      </Link>
    </AuthCard>
  )
}

function problemMark(isBroken?: boolean): StatusMark {
  if (isBroken === true) {
    return BROKEN_LINK.mark
  }

  return AUTH_MARKS.failed
}
