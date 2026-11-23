import type { JSX, SubmitEvent } from 'react'
import { useState } from 'react'

import {
  useCaptchaQuery,
  useRemoveCaptchaMutation,
  useSaveCaptchaMutation,
} from '@/modules/project-settings/captcha/queries/use-captcha'
import { Button } from '@/shared/ui/button'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { FormField } from '@/shared/ui/form-field'
import { LoadError } from '@/shared/ui/load-error'
import { SavedNote } from '@/shared/ui/saved-note'
import { SettingsSection } from '@/shared/ui/settings-section'
import { Skeleton } from '@/shared/ui/skeleton'

/** Cloudflare Turnstile on signup, password login and emailed links. */
export function CaptchaSection({ projectId }: { projectId: string }): JSX.Element {
  const captcha = useCaptchaQuery(projectId)

  if (captcha.data === undefined) {
    return <CaptchaLoading error={captcha.error} onRetry={() => captcha.refetch()} />
  }

  const siteKey = captcha.data.site_key ?? null

  return <CaptchaForm key={siteKey ?? 'off'} projectId={projectId} siteKey={siteKey} />
}

type CaptchaFormProps = { projectId: string; siteKey: string | null }

function CaptchaForm({ projectId, siteKey }: CaptchaFormProps): JSX.Element {
  const save = useSaveCaptchaMutation(projectId)
  const remove = useRemoveCaptchaMutation(projectId)
  const [newSiteKey, setNewSiteKey] = useState(siteKey ?? '')
  const [secretKey, setSecretKey] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)

  // Turning it on refuses every signup and login that comes without a token: ask first.
  function submit(event: SubmitEvent<HTMLFormElement>): void {
    event.preventDefault()

    if (siteKey === null) {
      setIsConfirming(true)
      return
    }

    save.mutate(keys())
  }

  async function enable(): Promise<void> {
    await save.mutateAsync(keys())
  }

  function keys(): { site_key: string; secret_key: string } {
    return { site_key: newSiteKey.trim(), secret_key: secretKey.trim() }
  }

  return (
    <form onSubmit={submit}>
      <SettingsSection
        title="Proteção contra bots"
        description={statusText(siteKey)}
        footer={
          <>
            <SavedNote isSaved={save.isSuccess} message="Captcha ativo" />
            <DisableButton
              siteKey={siteKey}
              isPending={remove.isPending}
              onDisable={() => remove.mutateAsync()}
            />
            <Button type="submit" disabled={save.isPending} aria-busy={save.isPending}>
              {submitLabel(siteKey)}
            </Button>
          </>
        }
      >
        <FormField
          label="Site key do Turnstile"
          required
          maxLength={200}
          autoComplete="off"
          value={newSiteKey}
          onChange={(event) => setNewSiteKey(event.target.value)}
        />
        <FormField
          label="Secret key do Turnstile"
          hint="Fica criptografada; o console não mostra de novo."
          type="password"
          required
          maxLength={200}
          autoComplete="off"
          value={secretKey}
          onChange={(event) => setSecretKey(event.target.value)}
        />
        <ErrorAlert error={sectionError(isConfirming, save.error ?? remove.error)} />
        <ConfirmDialog
          isOpen={isConfirming}
          onOpenChange={setIsConfirming}
          title="Exigir captcha agora?"
          description="Cadastro, login com senha e os links por email passam a ser recusados sem o token do Turnstile. Ative só depois que o seu app mostrar o widget e enviar captcha_token."
          confirmLabel="Ativar captcha"
          isWeighty
          onConfirm={enable}
        />
      </SettingsSection>
    </form>
  )
}

/** While the confirmation is open, it shows the failure itself, next to the decision. */
function sectionError(isConfirming: boolean, error: Error | null): Error | null {
  if (isConfirming) {
    return null
  }

  return error
}

function statusText(siteKey: string | null): string {
  if (siteKey === null) {
    return 'Desligada. Com as chaves de um widget do Cloudflare Turnstile, cadastro, login com senha e envio de links passam a exigir o captcha resolvido.'
  }

  return 'Ligada: cadastro, login com senha e envio de links exigem o captcha resolvido. Seu app mostra o widget com a site key.'
}

function submitLabel(siteKey: string | null): string {
  if (siteKey === null) {
    return 'Ativar captcha'
  }

  return 'Trocar chaves'
}

type DisableButtonProps = {
  siteKey: string | null
  isPending: boolean
  onDisable: () => Promise<void>
}

function DisableButton({ siteKey, isPending, onDisable }: DisableButtonProps): JSX.Element | null {
  if (siteKey === null) {
    return null
  }

  return (
    <ConfirmButton
      size="default"
      title="Desligar o captcha?"
      description="Cadastro e login deixam de exigir o captcha na hora. A secret key guardada é apagada."
      confirmLabel="Desligar captcha"
      isDestructive
      isPending={isPending}
      onConfirm={onDisable}
    >
      Desligar
    </ConfirmButton>
  )
}

type CaptchaLoadingProps = { error: Error | null; onRetry: () => void }

function CaptchaLoading({ error, onRetry }: CaptchaLoadingProps): JSX.Element {
  if (error !== null) {
    return <LoadError error={error} onRetry={onRetry} />
  }

  return <Skeleton className="h-64 rounded-xl" />
}
