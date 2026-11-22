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
      code={statusCode(error)}
      title="Esta página não carregou"
      description="Tente de novo. Se o erro se repetir, copie o relatório abaixo para quem cuida do console."
      actions={
        <>
          <Button type="button" onClick={() => void retry()}>
            Tentar de novo
          </Button>
          <Button asChild variant="outline">
            <a href="/">Ir para os projetos</a>
          </Button>
        </>
      }
      aside={<ErrorReport error={error} />}
    />
  )
}

/** The error's class in the mono status line ("Erro · TypeError"), when it names one. */
function statusCode(error: unknown): string {
  if (error instanceof Error && error.name.trim() !== '') {
    return `Erro · ${error.name}`
  }

  return 'Erro'
}
