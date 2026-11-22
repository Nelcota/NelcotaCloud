import { describe, expect, it } from 'vitest'

import { healthNoticeOf } from '@/modules/overview/components/health-notice-rule'
import { databaseStatus, statusOf } from '@/modules/overview/components/service-status'
import { isPublicSite, setupSteps } from '@/modules/overview/components/setup-steps'
import { ApiError } from '@/shared/api/api-error'

const FACTS = {
  publishableKeys: 1,
  siteUrl: 'https://loja.example.com',
  providers: 0,
  hasOwnSmtp: false,
  users: 0,
}

describe('setup steps', () => {
  it('count a public site as production and a local one as not', () => {
    expect(isPublicSite('https://loja.example.com')).toBe(true)
    expect(isPublicSite('http://localhost:5173')).toBe(false)
    expect(isPublicSite('http://app.localhost')).toBe(false)
    expect(isPublicSite('not a url')).toBe(false)
  })

  it('mark what is done from live facts', () => {
    const done = setupSteps(FACTS, 'p').map((step) => [step.id, step.isDone])

    expect(done).toEqual([
      ['key', true],
      ['site', true],
      ['social', false],
      ['smtp', false],
      ['user', false],
    ])
  })
})

describe('the verdict sentence', () => {
  it('names the next step without a button: the next steps card holds the actions', () => {
    const steps = setupSteps(FACTS, 'p')
    const notice = healthNoticeOf({ summary: undefined, steps, days: 30, projectId: 'p' })

    expect(notice).toEqual({
      tone: 'info',
      text: 'Configuração 2 de 5. Próximo passo: ative o login social.',
      action: null,
    })
  })

  it('puts refused logins first, with the way to the log', () => {
    const summary = {
      logins: 0,
      active_users: 0,
      failures: 40,
      changes: 0,
      failing_addresses: [
        {
          ip_address: '203.0.113.9',
          failures: 38,
          accounts: 3,
          last_seen_at: '2026-11-22T00:00:00Z',
        },
      ],
    }
    const notice = healthNoticeOf({ summary, steps: [], days: 7, projectId: 'p' })

    expect(notice?.tone).toBe('warning')
    expect(notice?.text).toContain('203.0.113.9')
    expect(notice?.action).toEqual({ label: 'Ver atividade', to: '/projects/p/activity' })
  })
})

describe('service status', () => {
  it('reads Storage turned off as a setting, not as a failure', () => {
    const error = new ApiError({ status: 503, code: 'storage_not_configured', message: 'off' })

    expect(
      statusOf({ status: 'error', data: undefined, error }, () => ({ tone: 'success', label: '' })),
    ).toEqual({
      tone: 'neutral',
      label: 'Não configurado',
    })
  })

  it('still shows real failures in red', () => {
    const error = new ApiError({ status: 503, code: 'storage_unavailable', message: 'down' })

    expect(
      statusOf({ status: 'error', data: undefined, error }, () => ({ tone: 'success', label: '' }))
        .tone,
    ).toBe('error')
  })

  it('counts plain tables only', () => {
    const tables = [{ kind: 'table' }, { kind: 'view' }, { kind: 'table' }]
    const schema = { tables, functions: [] } as unknown as Parameters<typeof databaseStatus>[0]

    expect(databaseStatus(schema)).toEqual({ tone: 'success', label: '2 tabelas' })
  })
})
