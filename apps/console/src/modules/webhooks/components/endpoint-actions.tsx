import { Ellipsis, Pencil, Send, Trash2, RefreshCw as Refresh } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import {
  EndpointDialogs,
  type EndpointOverlay,
} from '@/modules/webhooks/components/endpoint-dialogs'
import { hostOf } from '@/modules/webhooks/components/endpoint-host'
import type { EndpointPanel } from '@/modules/webhooks/components/endpoint-panel-types'
import { Button } from '@/shared/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'

type EndpointActionsProps = { panel: EndpointPanel; onTest: () => void }

/** The panel's menu; edit, new secret and delete open their dialogs after the menu closes. */
export function EndpointActions({ panel, onTest }: EndpointActionsProps): JSX.Element {
  const { endpoint, rotation } = panel
  const [overlay, setOverlay] = useState<EndpointOverlay>(null)

  function closeWhenHidden(isOpen: boolean): void {
    if (isOpen) {
      return
    }

    setOverlay(null)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label={`Ações de ${hostOf(endpoint.url)}`}
          >
            <Ellipsis aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setOverlay('edit')}>
            <Pencil aria-hidden />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onTest}>
            <Send aria-hidden />
            Enviar evento de teste
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={rotation.canRotate === false}
            onSelect={() => setOverlay('rotate')}
          >
            <Refresh aria-hidden />
            Novo segredo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onSelect={() => setOverlay('delete')}>
            <Trash2 aria-hidden />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <EndpointDialogs panel={panel} overlay={overlay} onOpenChange={closeWhenHidden} />
    </>
  )
}
