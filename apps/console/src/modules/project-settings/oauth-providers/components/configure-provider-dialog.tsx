import type { JSX } from 'react'
import { useState } from 'react'

import type { OAuthProvider } from '@nelcota/sdk'
import { ProviderAppGuide } from '@/modules/project-settings/oauth-providers/components/provider-app-guide'
import { ProviderLoginIllustration } from '@/modules/project-settings/oauth-providers/components/provider-illustrations'
import { PROVIDER_NAMES } from '@/modules/project-settings/oauth-providers/model/provider-names'
import { useConfigureProviderMutation } from '@/modules/project-settings/oauth-providers/queries/use-oauth-providers'
import { Button } from '@/shared/ui/button'
import { FormField } from '@/shared/ui/form-field'
import { ReviewList } from '@/shared/ui/review-list'
import { CheckField } from '@/shared/ui/check-field'
import { missingUnless } from '@/shared/ui/step-dialog/missing-unless'
import { StepDialog } from '@/shared/ui/step-dialog/step-dialog'

const STORED_SECRET = 'Guardado cifrado'

type ConfigureProviderDialogProps = {
  projectId: string
  provider: OAuthProvider
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
  const illustration = <ProviderLoginIllustration provider={provider} />

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
      <Button variant="outline" size="sm" onClick={open}>
        {props.triggerLabel}
      </Button>
      <StepDialog
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        title={`Login com ${providerName}`}
        description={`Seus usuários entram no app com a conta ${providerName}, sem criar senha.`}
        finishLabel="Salvar e ativar"
        workingLabel="Ativando…"
        onFinish={finish}
        summary={[
          { label: 'Provedor', value: providerName },
          { label: 'App criado', value: appCreatedText(isAppCreated) },
          { label: 'Client ID', value: clientId.trim() },
        ]}
        steps={[
          {
            label: 'Criar o app',
            description: 'Crie um app de login no provedor e cole nele a URL de callback.',
            missing: missingUnless(isAppCreated, 'Confirme que o app foi criado'),
            illustration,
            content: (
              <div className="grid gap-5">
                <ProviderAppGuide provider={provider} />
                <CheckField
                  label={`Já criei o app no ${providerName} e colei a URL de callback`}
                  isChecked={isAppCreated}
                  onChange={setIsAppCreated}
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
              <div className="grid gap-4">
                <FormField
                  label="Client ID"
                  required
                  autoComplete="off"
                  spellCheck={false}
                  autoFocus
                  value={clientId}
                  onChange={(event) => setClientId(event.target.value)}
                />
                <FormField
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
            illustration,
            content: (
              <ReviewList
                items={[
                  { label: 'Provedor', value: providerName },
                  {
                    label: 'Client ID',
                    value: <code className="font-mono text-xs break-all">{clientId.trim()}</code>,
                  },
                  { label: 'Client secret', value: STORED_SECRET },
                ]}
              />
            ),
          },
        ]}
      />
    </>
  )
}

function appCreatedText(isAppCreated: boolean): string {
  if (isAppCreated) {
    return 'Sim'
  }

  return ''
}
