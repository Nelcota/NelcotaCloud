import type { ApiUsagePeriod, ApiUsageReport } from '@/modules/database/api/read-api-usage'
import { formatCount, formatShare } from '@/shared/lib/format-number'
import type { NoticeTone } from '@/shared/ui/notice'

export type TrafficSummary = { tone: NoticeTone; verdict: string; sentence: string }

const PERIOD_WORDS: Record<ApiUsagePeriod, string> = {
  '24h': 'nas últimas 24 horas',
  '7d': 'nos últimos 7 dias',
  '30d': 'nos últimos 30 dias',
}

/** Above 1% of server errors the API needs attention, as the alert channels also judge. */
const ERROR_ATTENTION_RATIO = 0.01

/** The verdict on the period's traffic, from its own numbers. */
export function trafficSummary(report: ApiUsageReport, period: ApiUsagePeriod): TrafficSummary {
  const when = PERIOD_WORDS[period]

  if (report.requests === 0) {
    return { tone: 'info', verdict: 'Sem tráfego.', sentence: `Nenhuma requisição ${when}.` }
  }

  const share = report.server_errors / report.requests

  if (report.server_errors === 0) {
    return {
      tone: 'success',
      verdict: 'Saudável.',
      sentence: `Nenhum erro de servidor em ${formatCount(report.requests)} requisições ${when}.`,
    }
  }

  return {
    tone: toneFor(share),
    verdict: verdictFor(share),
    sentence: `${formatCount(report.server_errors)} erros de servidor (${formatShare(share)}) ${when}.`,
  }
}

function toneFor(share: number): NoticeTone {
  if (share >= ERROR_ATTENTION_RATIO) {
    return 'error'
  }

  return 'warning'
}

function verdictFor(share: number): string {
  if (share >= ERROR_ATTENTION_RATIO) {
    return 'Falhando.'
  }

  return 'Atenção.'
}

/** Mean time per request, "—" without requests. */
export function averageMilliseconds(report: ApiUsageReport): string {
  if (report.requests === 0) {
    return '—'
  }

  return `${Math.round(report.duration_milliseconds / report.requests)} ms`
}
