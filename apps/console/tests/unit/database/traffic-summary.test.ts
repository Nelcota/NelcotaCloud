import { describe, expect, it } from 'vitest'

import type { ApiUsageReport } from '@/modules/database/api/read-api-usage'
import { averageMilliseconds, trafficSummary } from '@/modules/database/components/traffic-summary'

function report(overrides: Partial<ApiUsageReport>): ApiUsageReport {
  return {
    requests: 0,
    client_errors: 0,
    server_errors: 0,
    duration_milliseconds: 0,
    series: [],
    resources: [],
    statuses: [],
    methods: [],
    ...overrides,
  }
}

describe('trafficSummary', () => {
  it('says when there was no traffic', () => {
    expect(trafficSummary(report({}), '24h')).toEqual({
      tone: 'info',
      verdict: 'Sem tráfego.',
      sentence: 'Nenhuma requisição nas últimas 24 horas.',
    })
  })

  it('calls the API healthy without server errors, client errors aside', () => {
    const summary = trafficSummary(report({ requests: 30, client_errors: 17 }), '7d')

    expect(summary.tone).toBe('success')
    expect(summary.sentence).toBe('Nenhum erro de servidor em 30 requisições nos últimos 7 dias.')
  })

  it('warns below 1% of server errors and fails above it', () => {
    expect(trafficSummary(report({ requests: 1000, server_errors: 5 }), '30d').verdict).toBe(
      'Atenção.',
    )
    expect(trafficSummary(report({ requests: 100, server_errors: 5 }), '30d')).toMatchObject({
      tone: 'error',
      verdict: 'Falhando.',
    })
  })
})

describe('averageMilliseconds', () => {
  it('divides the total time by the requests, a dash without requests', () => {
    expect(averageMilliseconds(report({ requests: 4, duration_milliseconds: 1001 }))).toBe('250 ms')
    expect(averageMilliseconds(report({}))).toBe('—')
  })
})
