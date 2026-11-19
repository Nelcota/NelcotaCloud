import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import DangerTriangle from '~icons/solar/danger-triangle-linear'
import type { JSX } from 'react'

import { ErrorReport } from '@/app/error-report'
import { StatusScreen } from '@/app/status-screen'
import { SUPPORT_EMAIL } from '@/shared/lib/support-email'
import { Button } from '@/shared/ui/button'
import { buttonVariants } from '@/shared/ui/button-variants'

/**
 * Shown when a page throws while rendering or loading. "Voltar ao início" is a full page
 * load on purpose: the router state that failed may be what broke, so a fresh start is the
 * safest way out.
 */
export function RouteErrorPage({ error, reset }: ErrorComponentProps): JSX.Element {
  const router = useRouter()

  async function retry(): Promise<void> {
    reset()
    await router.invalidate()
  }

  return (
    <StatusScreen
      title="Algo deu errado"
      tabTitle="Erro"
      mark={{ icon: DangerTriangle, tone: 'danger' }}
      description={errorAdvice()}
      actions={
        <>
          <Button size="lg" onClick={retry}>
            Tentar de novo
          </Button>
          <a href="/" className={buttonVariants({ variant: 'secondary', size: 'lg' })}>
            Voltar ao início
          </a>
        </>
      }
      details={<ErrorReport error={error} />}
    />
  )
}

/** Points to support only when there is a support address to write to. */
function errorAdvice(): string {
  if (SUPPORT_EMAIL === '') {
    return 'Tente de novo. Se continuar, copie os detalhes do erro e envie para quem cuida da sua conta.'
  }

  return `Tente de novo. Se continuar, envie os detalhes do erro para ${SUPPORT_EMAIL}.`
}
