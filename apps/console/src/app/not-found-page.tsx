import { Link } from '@tanstack/react-router'
import { Compass } from 'lucide-react'
import type { JSX } from 'react'

import { StatusScreen } from '@/app/status-screen'
import { buttonVariants } from '@/shared/ui/button-variants'

/** Shown for any URL the console does not have, such as an old or mistyped link. */
export function NotFoundPage(): JSX.Element {
  return (
    <StatusScreen
      icon={Compass}
      tone="neutral"
      title="Página não encontrada"
      description="O endereço pode estar errado ou a página mudou de lugar. Seus projetos continuam onde estavam."
      actions={
        <Link to="/" className={buttonVariants()}>
          Ir para os projetos
        </Link>
      }
    />
  )
}
