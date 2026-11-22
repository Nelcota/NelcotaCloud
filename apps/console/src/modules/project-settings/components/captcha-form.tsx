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
import { PendingButton } from '@/shared/ui/pending-button'
import { Input } from '@/shared/ui/primitives/input'
import { SavedNote } from '@/shared/ui/saved-note'

type CaptchaFormProps = { projectId: string; siteKey: string | null }

const SUBMIT_LABELS = { off: 'Ativar captcha', on: 'Trocar chaves' } as const

export function CaptchaForm({ projectId, siteKey }: CaptchaFormProps): JSX.Element {
  const siteKeyId = useId()
  const secretKeyId = useId()
  const save = useSaveCaptchaMutation(projectId)
  const remove = useRemoveCaptchaMutation(projectId)
  const [newSiteKey, setNewSiteKey] = useState(siteKey ?? '')
  const [secretKey, setSecretKey] = useState('')
  const state = stateOf(siteKey)

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    save.mutate({ site_key: newSiteKey.trim(), secret_key: secretKey.trim() })
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
          <SavedNote isSaved={save.isSuccess} message="Captcha ativo" />
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
    </SettingsGroup>
  )
}

function stateOf(siteKey: string | null): keyof typeof SUBMIT_LABELS {
  if (siteKey === null) {
    return 'off'
  }

  return 'on'
}
