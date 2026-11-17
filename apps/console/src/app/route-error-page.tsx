import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ErrorReport } from '@/app/error-report'
import { StatusScreen } from '@/app/status-screen'
import { Button } from '@/shared/ui/button'
import { buttonVariants } from '@/shared/ui/button-variants'

/**
 * Shown when a page throws while rendering or loading. "Ir para os projetos" is a full page
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
      title="Esta página não carregou"
      description="Tente de novo. Se o erro se repetir, copie o relatório do erro e envie para nós."
      actions={
        <>
          <Button size="lg" onClick={retry}>
            Tentar de novo
          </Button>
          <a href="/" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
            Ir para os projetos
          </a>
        </>
      }
      aside={<ErrorReport error={error} />}
    />
  )
}
