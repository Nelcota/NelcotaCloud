import { Link } from '@tanstack/react-router'
import MapPointSearch from '~icons/solar/map-point-search-linear'
import type { JSX } from 'react'

import { StatusScreen } from '@/app/status-screen'
import { buttonVariants } from '@/shared/ui/button-variants'

/** Shown for any URL the console does not have, such as an old or mistyped link. */
export function NotFoundPage(): JSX.Element {
  return (
    <StatusScreen
      title="Essa página não existe"
      tabTitle="Página não encontrada"
      mark={{ icon: MapPointSearch, tone: 'neutral' }}
      description="Confira se o endereço está certo."
      actions={
        <Link to="/" className={buttonVariants({ size: 'lg' })}>
          Voltar ao início
        </Link>
      }
    />
  )
}
