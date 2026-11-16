import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import RotateCcw from '~icons/solar/restart-linear'
import TriangleAlert from '~icons/solar/danger-triangle-linear'
import type { JSX } from 'react'

import { StatusScreen } from '@/app/status-screen'
import { Button } from '@/shared/ui/button'
import { buttonVariants } from '@/shared/ui/button-variants'

const UNKNOWN_ERROR = 'Erro desconhecido.'

/**
 * Shown when a page throws while rendering or loading. "Início" is a full page load on purpose:
 * the router state that failed may be what broke, so a fresh start is the safest way out.
 */
export function RouteErrorPage({ error, reset }: ErrorComponentProps): JSX.Element {
  const router = useRouter()

  async function retry(): Promise<void> {
    reset()
    await router.invalidate()
  }

  return (
    <StatusScreen
      icon={TriangleAlert}
      tone="danger"
      title="Algo deu errado"
      description="Esta página encontrou um erro inesperado. Seus dados estão seguros; tente de novo ou volte ao início."
      actions={
        <>
          <Button onClick={retry}>
            <RotateCcw className="size-5" />
            Tentar de novo
          </Button>
          <a href="/" className={buttonVariants({ variant: 'outline' })}>
            Voltar ao início
          </a>
        </>
      }
    >
      <ErrorDetails error={error} />
    </StatusScreen>
  )
}

/** The technical message, folded away so it helps a bug report without scaring anyone. */
function ErrorDetails({ error }: { error: unknown }): JSX.Element {
  return (
    <details className="bg-card mt-10 rounded-lg border text-left">
      <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring rounded-lg px-4 py-3 text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none">
        Detalhes técnicos
      </summary>
      <pre className="text-destructive max-h-48 overflow-auto border-t px-4 py-3 font-mono text-xs break-words whitespace-pre-wrap">
        {messageOf(error)}
      </pre>
    </details>
  )
}

function messageOf(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message
  }

  return UNKNOWN_ERROR
}
