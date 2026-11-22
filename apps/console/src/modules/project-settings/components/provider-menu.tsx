import { LogIn as Login, Ellipsis as MenuDots, Trash2 as TrashBin } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { PROVIDER_NAMES } from '@/modules/project-settings/components/provider-names'
import { useRemoveProviderMutation } from '@/modules/project-settings/queries/use-oauth-providers'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'

type ProviderMenuProps = { projectId: string; provider: OAuthProviderName }

/** The rarely used step of a configured provider: turning it off, after a confirmation. */
export function ProviderMenu({ projectId, provider }: ProviderMenuProps): JSX.Element {
  const [isConfirming, setIsConfirming] = useState(false)
  const removal = useRemoveProviderMutation({ projectId, provider })
  const providerName = PROVIDER_NAMES[provider]

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Mais ações: ${providerName}`}
          >
            <MenuDots aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onSelect={() => setIsConfirming(true)}>
            <TrashBin aria-hidden />
            Desativar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        isOpen={isConfirming}
        onOpenChange={setIsConfirming}
        title={`Desativar o login com ${providerName}?`}
        description="O botão deixa de funcionar no app e as credenciais são apagadas. Usuários que entravam só por ele precisarão de outro jeito de entrar."
        confirmLabel="Desativar"
        change={{
          subject: `Login com ${providerName}`,
          icon: Login,
          from: 'Ativo',
          to: 'Desativado',
        }}
        isDestructive
        onConfirm={() => removal.mutateAsync()}
      />
    </>
  )
}
