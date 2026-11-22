import { CONCENTRATED_FAILURES } from '@/modules/overview/components/insight-data-rules'
import { countText } from '@/modules/overview/components/insight-text'
import type { SetupStep } from '@/modules/overview/components/setup-steps'
import type { components } from '@/shared/api/api-schema'
import type { NoticeTone } from '@/shared/ui/notice'

export type HealthNotice = {
  tone: NoticeTone
  text: string
  action: { label: string; to: string }
}

type HealthNoticeSources = {
  summary: components['schemas']['AuditSummary'] | undefined
  steps: SetupStep[] | null
  days: number
  projectId: string
}

/** The one line above the metrics: refused logins worth a look, else the setup left to do. */
export function healthNoticeOf(sources: HealthNoticeSources): HealthNotice | null {
  const base = `/projects/${sources.projectId}`
  const failures = refusedLoginsNotice(sources, base)

  if (failures !== null) {
    return failures
  }

  return setupNotice(sources.steps)
}

function refusedLoginsNotice(
  { summary, days }: HealthNoticeSources,
  base: string,
): HealthNotice | null {
  if (summary === undefined || summary.failures < CONCENTRATED_FAILURES) {
    return null
  }

  const origin = originOf(summary.failing_addresses[0])
  const count = countText(summary.failures, 'login recusado', 'logins recusados')

  return {
    tone: 'warning',
    text: `${count} nos últimos ${days} dias${origin}.`,
    action: { label: 'Ver atividade', to: `${base}/activity` },
  }
}

function originOf(top: components['schemas']['FailingAddress'] | undefined): string {
  if (top === undefined) {
    return ''
  }

  return `, ${top.failures.toLocaleString('pt-BR')} de ${top.ip_address}`
}

function setupNotice(steps: SetupStep[] | null): HealthNotice | null {
  const next = steps?.find((step) => step.isDone === false)

  if (steps === null || next === undefined) {
    return null
  }

  const done = steps.filter((step) => step.isDone).length

  return {
    tone: 'info',
    text: `Configuração incompleta, ${done} de ${steps.length}: ${next.label.toLowerCase()}.`,
    action: { label: next.actionLabel, to: next.to },
  }
}
