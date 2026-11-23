import { ArrowLeft } from 'lucide-react'
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
      code="Erro 404"
      title="Página não encontrada"
      description={
        <>
          <InlineCode>{pathname}</InlineCode> não existe no console. Confira o endereço ou volte
          para os projetos.
        </>
      }
      actions={
        <Button asChild>
          <RouterLink href="/">
            <ArrowLeft aria-hidden data-icon="inline-start" />
            Ir para os projetos
          </RouterLink>
        </Button>
      }
    />
  )
}
