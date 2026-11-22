import type { JSX } from 'react'

import {
  type SmtpDraft,
  type SmtpStepProps,
  withUsername,
} from '@/modules/project-settings/components/smtp-draft'
import { SMTP_PRESETS, type SmtpPreset } from '@/modules/project-settings/components/smtp-presets'
import { TextField } from '@/shared/ui/text-field'

/** The server's credentials; the password is write-only, like every secret of the project. */
export function SmtpLoginStep({ draft, onChange }: SmtpStepProps): JSX.Element {
  return (
    <div className="flex flex-col gap-4">
      <ProviderLoginHint preset={presetOf(draft)} />
      <TextField
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
      <TextField
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
    <p className="rounded-lg border bg-surface px-3.5 py-3 text-sm text-pretty text-muted-foreground">
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
      className="font-medium text-primary underline-offset-4 hover:underline"
    >
      {link.label}
    </a>
  )
}
