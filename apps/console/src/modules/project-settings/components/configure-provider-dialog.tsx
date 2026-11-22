import type { JSX } from 'react'
import { useState } from 'react'

import type { OAuthProviderName } from '@/modules/project-settings/api/configure-provider'
import { ProviderAppGuide } from '@/modules/project-settings/components/provider-app-guide'
import { PROVIDER_NAMES } from '@/modules/project-settings/components/provider-names'
import { useConfigureProviderMutation } from '@/modules/project-settings/queries/use-oauth-providers'
import { DataList, DataListItem } from '@/shared/ui/data-list'
import { Button } from '@/shared/ui/primitives/button'
import { missingUnless } from '@/shared/ui/step-dialog/missing-unless'
import { StepDialog } from '@/shared/ui/step-dialog/step-dialog'
import { CheckboxField } from '@/shared/ui/switch-field'
import { TextField } from '@/shared/ui/text-field'

const STORED_SECRET = 'Guardado cifrado'

type ConfigureProviderDialogProps = {
  projectId: string
  provider: OAuthProviderName
  callbackUrl: string
  /** "Configurar" the first time, "Trocar credenciais" after. */
  triggerLabel: string
}

/**
 * Turns on login with one provider: create the OAuth app there, paste its credentials here,
 * review. The client secret is write-only: encrypted on save and never shown again.
 */
export function ConfigureProviderDialog(props: ConfigureProviderDialogProps): JSX.Element {
  const { projectId, provider } = props
  const [isOpen, setIsOpen] = useState(false)
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [isAppCreated, setIsAppCreated] = useState(false)
  const save = useConfigureProviderMutation({ projectId, provider })
  const providerName = PROVIDER_NAMES[provider]

  function open(): void {
    setClientId('')
    setClientSecret('')
    setIsAppCreated(false)
    setIsOpen(true)
  }

  async function finish(): Promise<void> {
    await save.mutateAsync({ client_id: clientId.trim(), client_secret: clientSecret.trim() })
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={open}>
        {props.triggerLabel}
      </Button>
      <StepDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={`Login com ${providerName}`}
        description={`Seus usuários entram no app com a conta ${providerName}, sem criar senha.`}
        finishLabel="Salvar e ativar"
        onFinish={finish}
        steps={[
          {
            label: 'Criar o app',
            description: 'Crie um app de login no provedor e cole nele a URL de callback.',
            missing: missingUnless(isAppCreated, 'Confirme que o app foi criado'),
            content: (
              <div className="flex flex-col gap-4">
                <ProviderAppGuide provider={provider} callbackUrl={props.callbackUrl} />
                <CheckboxField
                  label={`Já criei o app no ${providerName} e colei a URL de callback`}
                  checked={isAppCreated}
                  onCheckedChange={setIsAppCreated}
                />
              </div>
            ),
          },
          {
            label: 'Credenciais',
            description: 'Cole aqui as credenciais que o provedor gerou.',
            missing: missingUnless(
              clientId.trim() !== '' && clientSecret.trim() !== '',
              'Cole o Client ID e o Client secret',
            ),
            content: (
              <div className="flex flex-col gap-4">
                <TextField
                  label="Client ID"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                />
                <TextField
                  label="Client secret"
                  type="password"
                  required
                  autoComplete="off"
                  hint="Fica cifrado e não aparece de novo."
                  value={clientSecret}
                  onChange={(event) => setClientSecret(event.target.value)}
                />
              </div>
            ),
          },
          {
            label: 'Revisar',
            description: 'Confira antes de ativar o login.',
            missing: null,
            content: (
              <DataList className="rounded-xl bg-surface px-4">
                <DataListItem label="Provedor">{providerName}</DataListItem>
                <DataListItem label="Client ID">
                  <code className="font-mono wrap-anywhere">{clientId.trim()}</code>
                </DataListItem>
                <DataListItem label="Client secret">{STORED_SECRET}</DataListItem>
              </DataList>
            ),
          },
        ]}
      />
    </>
  )
}
