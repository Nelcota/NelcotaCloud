import type { JSX } from 'react'

import type { components } from '@/shared/api/api-schema'
import { SummarySentence } from '@/shared/ui/summary-sentence'

type SmtpSettingsView = components['schemas']['SmtpSettingsView']

/** Who sends the project's emails, in one sentence: the project's own server or the platform's. */
export function SmtpSummary({ view }: { view: SmtpSettingsView }): JSX.Element {
  if (view.is_custom === false) {
    return (
      <SummarySentence tone="warning" verdict="Usando o servidor da plataforma.">
        Os emails saem com o endereço da NelcotaCloud. Configure o seu SMTP para enviar com o seu
        domínio.
      </SummarySentence>
    )
  }

  return (
    <SummarySentence tone="success" verdict="Enviando pelo seu servidor.">
      <ServerAddress host={view.smtp_host ?? null} port={view.smtp_port ?? null} />
    </SummarySentence>
  )
}

function ServerAddress({ host, port }: { host: string | null; port: number | null }): JSX.Element {
  if (host === null) {
    return <>Conexão com TLS.</>
  }

  if (port === null) {
    return (
      <>
        <code className="font-mono text-xs">{host}</code>, com TLS.
      </>
    )
  }

  return (
    <>
      <code className="font-mono text-xs">{host}</code>, porta{' '}
      <code className="font-mono text-xs tabular-nums">{port}</code>, com TLS.
    </>
  )
}
