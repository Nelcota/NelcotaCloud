import type { JSX } from 'react'

import { RowLink } from '@/modules/project-settings/components/row-link'
import { SettingsGroup } from '@/modules/project-settings/components/settings-group'
import { SettingsRow } from '@/modules/project-settings/components/settings-row'
import { SmtpMethodStatus } from '@/modules/project-settings/components/smtp-method-status'
import { SocialMethodStatus } from '@/modules/project-settings/components/social-method-status'
import { StatusBadge } from '@/shared/ui/status-badge'

/** Every way in, with its state and the page where it is configured. */
export function LoginMethodsGroup({ projectId }: { projectId: string }): JSX.Element {
  const base = `/projects/${projectId}`

  return (
    <SettingsGroup
      title="Métodos de login"
      description="Cada jeito de entrar e onde ele é configurado."
    >
      <SettingsRow title="Senha" description="Email e senha, com Argon2 e limite de tentativas.">
        <StatusBadge tone="success">Ativo</StatusBadge>
      </SettingsRow>
      <SettingsRow
        title="Link mágico"
        description="Link de uso único por email; cadastra emails novos."
      >
        <StatusBadge tone="success">Ativo</StatusBadge>
        <RowLink href={`${base}/email`} label="Textos" ariaLabel="Editar os textos dos emails" />
      </SettingsRow>
      <SettingsRow title="Login social" description="Google e GitHub com o app OAuth do projeto.">
        <SocialMethodStatus projectId={projectId} />
        <RowLink
          href={`${base}/providers`}
          label="Configurar"
          ariaLabel="Configurar o login social"
        />
      </SettingsRow>
      <SettingsRow title="SMTP" description="Servidor que envia verificação, redefinição e links.">
        <SmtpMethodStatus projectId={projectId} />
        <RowLink href={`${base}/email`} label="Configurar" ariaLabel="Configurar o email" />
      </SettingsRow>
    </SettingsGroup>
  )
}
