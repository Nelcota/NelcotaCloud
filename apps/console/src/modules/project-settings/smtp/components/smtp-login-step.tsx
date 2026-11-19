import type { SmtpStepProps } from '@/modules/project-settings/smtp/components/smtp-step-props'
import ExternalLink from '~icons/solar/square-arrow-right-up-linear'
import type { JSX } from 'react'

import { type SmtpDraft, withUsername } from '@/modules/project-settings/smtp/model/smtp-draft'
import { SMTP_PRESETS, type SmtpPreset } from '@/modules/project-settings/smtp/model/smtp-presets'
import { FormField } from '@/shared/ui/form-field'

/** The server's credentials; the password is write-only, like every secret of the project. */
export function SmtpLoginStep({ draft, onChange }: SmtpStepProps): JSX.Element {
  return (
    <div className="grid gap-4">
      <ProviderLoginHint preset={presetOf(draft)} />
      <FormField
        label="Usuário"
        placeholder="voce@seudominio.com"
        required
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        autoFocus
        value={draft.username}
        onChange={(event) => onChange(withUsername(draft, event.target.value))}
      />
      <FormField
        label="Senha"
        type="password"
        required
        autoComplete="new-password"
        hint="Fica cifrada e não aparece de novo."
        value={draft.password}
        onChange={(event) => onChange({ ...draft, password: event.target.value })}
      />
    </div>
  )
}

function presetOf(draft: SmtpDraft): SmtpPreset | null {
  if (draft.provider === null) {
    return null
  }

  return SMTP_PRESETS[draft.provider]
}

function ProviderLoginHint({ preset }: { preset: SmtpPreset | null }): JSX.Element | null {
  if (preset === null || preset.loginHint === undefined) {
    return null
  }

  return (
    <p className="text-muted-foreground text-sm text-pretty">
      {preset.loginHint} <LoginLink link={preset.loginLink} />
    </p>
  )
}

function LoginLink({ link }: { link: SmtpPreset['loginLink'] }): JSX.Element | null {
  if (link === undefined) {
    return null
  }

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noreferrer"
      className="text-primary-ink inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
    >
      {link.label}
      <ExternalLink aria-hidden="true" className="size-4" />
    </a>
  )
}
