import { useId, useState, type FormEvent, type JSX } from 'react'

import { captchaRule } from '@/modules/project-settings/components/captcha-rule'
import { CaptchaStatus } from '@/modules/project-settings/components/captcha-status'
import { DisableCaptchaButton } from '@/modules/project-settings/components/disable-captcha-button'
import { FormError } from '@/modules/project-settings/components/form-error'
import { SettingsGroup } from '@/modules/project-settings/components/settings-group'
import { rowDescriptionId } from '@/modules/project-settings/components/row-description-id'
import { SettingsRow } from '@/modules/project-settings/components/settings-row'
import {
  useRemoveCaptchaMutation,
  useSaveCaptchaMutation,
} from '@/modules/project-settings/queries/use-captcha'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { PendingButton } from '@/shared/ui/pending-button'
import { Input } from '@/shared/ui/primitives/input'
import { showFlash } from '@/shared/lib/flash-notice'

type CaptchaFormProps = { projectId: string; siteKey: string | null }

const SUBMIT_LABELS = { off: 'Ativar captcha', on: 'Trocar chaves' } as const

export function CaptchaForm({ projectId, siteKey }: CaptchaFormProps): JSX.Element {
  const siteKeyId = useId()
  const secretKeyId = useId()
  const save = useSaveCaptchaMutation(projectId)
  const remove = useRemoveCaptchaMutation(projectId)
  const [newSiteKey, setNewSiteKey] = useState(siteKey ?? '')
  const [secretKey, setSecretKey] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const state = stateOf(siteKey)

  // Turning it on refuses every signup and login that comes without a token: ask first.
  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (state === 'off') {
      setIsConfirming(true)
      return
    }

    save.mutate(keys(), { onSuccess: afterSave })
  }

  async function saveKeys(): Promise<void> {
    await save.mutateAsync(keys())
    afterSave()
  }

  function keys(): { site_key: string; secret_key: string } {
    return { site_key: newSiteKey.trim(), secret_key: secretKey.trim() }
  }

  // The secret leaves the page once stored: nothing keeps it in memory after the save.
  function afterSave(): void {
    setSecretKey('')
    showFlash('Captcha ativo.')
  }

  return (
    <SettingsGroup
      title="Cloudflare Turnstile"
      description={
        <span className="flex flex-wrap items-center gap-2">
          <CaptchaStatus siteKey={siteKey} />
          {captchaRule(siteKey)}
        </span>
      }
      onSubmit={submit}
      footer={
        <>
          <DisableCaptchaButton
            siteKey={siteKey}
            isPending={remove.isPending}
            onDisable={() => remove.mutateAsync()}
          />
          <PendingButton type="submit" size="sm" isPending={save.isPending}>
            {SUBMIT_LABELS[state]}
          </PendingButton>
        </>
      }
    >
      <SettingsRow
        title="Site key"
        description="Chave pública do widget."
        controlId={siteKeyId}
        isWide
      >
        <Input
          id={siteKeyId}
          required
          autoComplete="off"
          spellCheck={false}
          className="font-mono"
          aria-describedby={rowDescriptionId(siteKeyId)}
          value={newSiteKey}
          onChange={(event) => setNewSiteKey(event.target.value)}
        />
      </SettingsRow>
      <SettingsRow
        title="Secret key"
        description="Guardada cifrada."
        controlId={secretKeyId}
        isWide
      >
        <Input
          id={secretKeyId}
          type="password"
          required
          autoComplete="off"
          spellCheck={false}
          aria-describedby={rowDescriptionId(secretKeyId)}
          value={secretKey}
          onChange={(event) => setSecretKey(event.target.value)}
        />
      </SettingsRow>
      <FormError error={save.error ?? remove.error} />
      <ConfirmDialog
        isOpen={isConfirming}
        onOpenChange={setIsConfirming}
        title="Exigir captcha agora?"
        description="Cadastro, login com senha e os links por email passam a ser recusados sem o token do Turnstile. Ative só depois que o seu app mostrar o widget e enviar captcha_token."
        confirmLabel="Ativar captcha"
        isWeighty
        onConfirm={saveKeys}
      />
    </SettingsGroup>
  )
}

function stateOf(siteKey: string | null): keyof typeof SUBMIT_LABELS {
  if (siteKey === null) {
    return 'off'
  }

  return 'on'
}
