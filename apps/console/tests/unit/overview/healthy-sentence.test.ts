import { describe, expect, it } from 'vitest'

import { healthySentenceOf } from '@/modules/overview/components/healthy-sentence'

function summary(logins: number, failures: number): Parameters<typeof healthySentenceOf>[0] {
  return { logins, failures, active_users: 0, changes: 0, failing_addresses: [] }
}

describe('healthySentenceOf', () => {
  it('names the threshold when a few logins were refused', () => {
    expect(healthySentenceOf(summary(0, 4), 30)).toBe(
      '4 logins recusados em 4 tentativas nos últimos 30 dias. O alerta começa em 5 recusas.',
    )
  })

  it('says when nothing was refused or nobody tried', () => {
    expect(healthySentenceOf(summary(3, 0), 7)).toBe(
      'Nenhum login recusado em 3 tentativas nos últimos 7 dias.',
    )
    expect(healthySentenceOf(summary(0, 0), 7)).toBe(
      'Nenhum login nos últimos 7 dias, nada a revisar.',
    )
  })
})
