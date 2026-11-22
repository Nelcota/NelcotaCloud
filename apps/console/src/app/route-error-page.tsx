import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import type { JSX } from 'react'

import { ErrorReport } from '@/app/error-report'
import { StatusScreen } from '@/app/status-screen'
import { Button } from '@/shared/ui/primitives/button'

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
      description="Tente de novo. Se repetir, envie o relatório abaixo para nós."
      actions={
        <>
          <Button type="button" size="lg" onClick={() => void retry()}>
            Tentar de novo
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href="/">Ir para os projetos</a>
          </Button>
        </>
      }
      aside={<ErrorReport error={error} />}
    />
  )
}
