import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { RotateCcw, TriangleAlert } from 'lucide-react'
import type { JSX } from 'react'

import { Button } from '@/shared/ui/button'
import { buttonVariants } from '@/shared/ui/button-variants'
import { LogoMark } from '@/shared/ui/logo-mark'

const UNKNOWN_ERROR = 'Erro desconhecido.'

/**
 * Shown when a page throws while rendering or loading. It covers the whole screen because the
 * router renders it inside whichever layout the failing route belongs to. "Início" is a full page
 * load on purpose: the router state that failed may be what broke, so a fresh start is safest.
 */
export function RouteErrorPage({ error, reset }: ErrorComponentProps): JSX.Element {
  const router = useRouter()

  async function retry(): Promise<void> {
    reset()
    await router.invalidate()
  }

  return (
    <div
      role="alert"
      className="bg-background fixed inset-0 z-50 flex items-center justify-center overflow-x-hidden overflow-y-auto px-4 py-12"
    >
      <div
        aria-hidden="true"
        className="bg-destructive/10 pointer-events-none fixed top-1/3 left-1/2 size-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
      />
      <section className="relative w-full max-w-md text-center">
        <LogoMark className="mx-auto mb-10 size-9" />
        <span className="bg-destructive/10 text-destructive ring-destructive/20 mx-auto flex size-14 items-center justify-center rounded-2xl ring-1">
          <TriangleAlert className="size-7" strokeWidth={1.75} />
        </span>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">Algo deu errado</h1>
        <p className="text-muted-foreground mt-2 text-sm text-balance">
          Esta página encontrou um erro inesperado. Seus dados estão seguros; tente de novo ou volte
          ao início.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-2 sm:flex-row">
          <Button onClick={retry}>
            <RotateCcw className="size-4" strokeWidth={1.75} />
            Tentar de novo
          </Button>
          <a href="/" className={buttonVariants({ variant: 'outline' })}>
            Voltar ao início
          </a>
        </div>
        <ErrorDetails error={error} />
      </section>
    </div>
  )
}

/** The technical message, folded away so it helps a bug report without scaring anyone. */
function ErrorDetails({ error }: { error: unknown }): JSX.Element {
  return (
    <details className="bg-card group mt-10 rounded-lg border text-left">
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
