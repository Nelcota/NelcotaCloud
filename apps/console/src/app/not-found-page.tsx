import { useLocation } from '@tanstack/react-router'
import type { JSX } from 'react'

import { StatusScreen } from '@/app/status-screen'
import { RouterLink } from '@/shared/routing/router-link'
import { InlineCode } from '@/shared/ui/inline-code'
import { Button } from '@/shared/ui/primitives/button'

/** Shown for any URL the console does not have, such as an old or mistyped link. */
export function NotFoundPage(): JSX.Element {
  const { pathname } = useLocation()

  return (
    <StatusScreen
      title="Página não encontrada"
      description={
        <>
          <InlineCode>{pathname}</InlineCode> não existe.
        </>
      }
      actions={
        <Button asChild size="lg">
          <RouterLink href="/">Ir para os projetos</RouterLink>
        </Button>
      }
      aside={<p className="font-mono text-xs text-muted-foreground">Erro 404</p>}
    />
  )
}
