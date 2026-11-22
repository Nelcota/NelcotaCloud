import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { DataList, DataListItem } from '@/shared/ui/data-list'

type SmtpSettingsView = components['schemas']['SmtpSettingsView']

const NOT_SET = '—'

/** The project's own server as label and value rows; the API only accepts TLS servers. */
export function SmtpFacts({ view }: { view: SmtpSettingsView }): JSX.Element {
  if (view.is_custom === false) {
    return <PlatformFacts />
  }

  return (
    <DataList>
      <DataListItem label="Host">
        <code className="font-mono">{view.smtp_host ?? NOT_SET}</code>
      </DataListItem>
      <DataListItem label="Porta">
        <code className="font-mono tabular-nums">{portOf(view)}</code>
      </DataListItem>
      <DataListItem label="TLS">Exigido</DataListItem>
      <DataListItem label="Remetente">
        <code className="font-mono">{view.email_from ?? NOT_SET}</code>
      </DataListItem>
    </DataList>
  )
}

function PlatformFacts(): JSX.Element {
  return (
    <DataList>
      <DataListItem label="Servidor">SMTP da NelcotaCloud</DataListItem>
      <DataListItem label="Remetente">Endereço da plataforma</DataListItem>
      <DataListItem label="Seu domínio">Configure o seu SMTP para enviar com ele.</DataListItem>
    </DataList>
  )
}

function portOf(view: SmtpSettingsView): string {
  const port = view.smtp_port

  if (port === null || port === undefined) {
    return NOT_SET
  }

  return String(port)
}
