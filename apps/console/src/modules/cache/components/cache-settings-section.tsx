import type { JSX } from 'react'

import {
  useChangeCacheSettings,
  useClearProjectCache,
} from '@/modules/cache/queries/use-project-cache'
import { showFlash } from '@/shared/lib/flash-notice'
import { Button } from '@/shared/ui/button'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { SettingsSection } from '@/shared/ui/settings-section'

type CacheSettingsSectionProps = {
  projectId: string
  enabled: boolean
  configured: boolean
}

export function CacheSettingsSection(props: CacheSettingsSectionProps): JSX.Element {
  if (props.enabled) {
    return <EnabledCache {...props} />
  }

  return <DisabledCache {...props} />
}

function DisabledCache({ projectId, configured }: CacheSettingsSectionProps): JSX.Element {
  const change = useChangeCacheSettings(projectId)

  return (
    <SettingsSection title="Cache desativado">
      <p className="text-muted-foreground text-sm">
        {configured && 'Ative para armazenar dados temporários no servidor da sua aplicação.'}
        {configured === false && 'O serviço de cache ainda não está configurado neste ambiente.'}
      </p>
      <ErrorAlert error={change.error} />
      <div>
        <Button
          disabled={configured === false || change.isPending}
          aria-busy={change.isPending}
          onClick={() => change.mutate(true, { onSuccess: () => showFlash('Cache ativado.') })}
        >
          Ativar cache
        </Button>
      </div>
    </SettingsSection>
  )
}

function EnabledCache({ projectId, configured }: CacheSettingsSectionProps): JSX.Element {
  const change = useChangeCacheSettings(projectId)
  const clear = useClearProjectCache(projectId)

  return (
    <SettingsSection title="Cache ativo">
      {configured === false && (
        <p className="text-muted-foreground text-sm">
          O serviço de cache está desconfigurado neste ambiente.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <ConfirmButton
          title="Limpar o cache deste projeto?"
          description="As entradas atuais deixam de ser retornadas. As credenciais continuam funcionando."
          confirmLabel="Limpar cache"
          isPending={change.isPending || clear.isPending}
          onConfirm={async () => {
            await clear.mutateAsync()
            showFlash('Cache limpo.')
          }}
          isDestructive
        >
          Limpar cache
        </ConfirmButton>
        <ConfirmButton
          title="Desativar o cache deste projeto?"
          description="As entradas atuais são invalidadas e as credenciais ficam suspensas até você reativar o cache."
          confirmLabel="Desativar cache"
          isPending={change.isPending || clear.isPending}
          onConfirm={async () => {
            await change.mutateAsync(false)
            showFlash('Cache desativado.')
          }}
          isDestructive
        >
          Desativar cache
        </ConfirmButton>
      </div>
    </SettingsSection>
  )
}
