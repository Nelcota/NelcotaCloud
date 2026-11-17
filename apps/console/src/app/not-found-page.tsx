import { Link, useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'

import { StatusScreen } from '@/app/status-screen'
import { buttonVariants } from '@/shared/ui/button-variants'

/** Shown for any URL the console does not have, such as an old or mistyped link. */
export function NotFoundPage(): JSX.Element {
  const { pathname } = useLocation()

  return (
    <StatusScreen
      title="Página não encontrada"
      description={
        <>
          Não existe nada em{' '}
          <code className="bg-muted text-foreground rounded-md px-1.5 py-0.5 font-mono text-xs break-all">
            {pathname}
          </code>
          . Confira o endereço ou volte aos seus projetos.
        </>
      }
      actions={
        <Link to="/" className={buttonVariants({ size: 'lg' })}>
          Ir para os projetos
        </Link>
      }
      aside={<StatusCode />}
    />
  )
}

/** The HTTP status, set large as the page's one visual anchor. */
function StatusCode(): JSX.Element {
  return (
    <p
      aria-hidden="true"
      className="text-muted-foreground/20 hidden text-right text-9xl leading-none font-semibold tracking-tight tabular-nums select-none lg:block"
    >
      404
    </p>
  )
}
