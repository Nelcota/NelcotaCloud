import { isPlainTable } from '@/modules/database/components/table-kinds'
import type { QueueHealth } from '@/modules/webhooks/model/webhook-queue-health'
import type { components } from '@/shared/api/api-schema'

type TableOverview = components['schemas']['TableOverview']
type SmtpSettingsView = components['schemas']['SmtpSettingsView']

/** Something in the project that needs a change, with the page where it is made. */
export type AttentionItem = {
  id: string
  tone: 'destructive' | 'warning'
  title: string
  detail: string
  to: string
}

/** Without row level security, every request role reaches every row of the table. */
export function rlsAttention(projectId: string, tables: readonly TableOverview[]): AttentionItem[] {
  const exposed = tables.filter((table) => isPlainTable(table) && table.rls_enabled === false)
  const first = exposed[0]

  if (first === undefined) {
    return []
  }

  const detail = 'Qualquer chave lê e altera todas as linhas.'

  if (exposed.length === 1) {
    const to = `/projects/${projectId}/database/${encodeURIComponent(first.name)}`

    return [{ id: 'rls', tone: 'destructive', title: `Tabela ${first.name} sem RLS`, detail, to }]
  }

  const title = `${exposed.length} tabelas sem RLS`

  return [{ id: 'rls', tone: 'destructive', title, detail, to: `/projects/${projectId}/database` }]
}

export function webhookAttention(projectId: string, summary: QueueHealth): AttentionItem[] {
  const failed = summary.failed_last_day

  if (failed.value === 0) {
    return []
  }

  return [
    {
      id: 'webhooks',
      tone: 'destructive',
      title: deliveriesTitle(failed),
      detail: 'As tentativas destas entregas se esgotaram nas últimas 24 horas.',
      to: `/projects/${projectId}/webhooks`,
    },
  ]
}

function deliveriesTitle(failed: QueueHealth['failed_last_day']): string {
  if (failed.value === 1) {
    return '1 entrega de webhook falhou'
  }

  const count = new Intl.NumberFormat('pt-BR').format(failed.value)

  if (failed.is_capped) {
    return `${count}+ entregas de webhook falharam`
  }

  return `${count} entregas de webhook falharam`
}

/** Before the first user, the shared server is fine; with real users, its limits start to bite. */
export function smtpAttention(
  projectId: string,
  smtp: SmtpSettingsView,
  userCount: number,
): AttentionItem[] {
  if (smtp.is_custom || userCount === 0) {
    return []
  }

  return [
    {
      id: 'smtp',
      tone: 'warning',
      title: 'Emails saem pelo SMTP da plataforma',
      detail: 'O limite de envio é compartilhado. Configure o seu servidor.',
      to: `/projects/${projectId}/email`,
    },
  ]
}
