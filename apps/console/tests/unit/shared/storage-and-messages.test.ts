import { beforeEach, describe, expect, it } from 'vitest'

import { forgetSqlDrafts } from '@/modules/sql-editor/components/forget-sql-drafts'
import { MESSAGES_BY_CODE } from '@/shared/api/api-error-messages'

describe('forgetSqlDrafts', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('removes the SQL drafts and history of every project and nothing else', () => {
    localStorage.setItem('nelcota.sql-editor.p1', 'select 1')
    localStorage.setItem('nelcota.sql-history.p1', '[]')
    localStorage.setItem('nelcota.sql-editor.p2', 'select 2')
    localStorage.setItem('nelcota-console-session', 'keep')
    localStorage.setItem('theme', 'dark')

    forgetSqlDrafts()

    expect(Object.keys({ ...localStorage }).toSorted()).toEqual([
      'nelcota-console-session',
      'theme',
    ])
  })
})

describe('error messages', () => {
  it.each([
    'read_only_member',
    'notification_channel_limit',
    'notification_test_failed',
    'storage_not_configured',
    'storage_unavailable',
  ])('say %s in Portuguese', (code) => {
    expect(MESSAGES_BY_CODE[code]).toMatch(/[a-zá-ú]/)
    expect(MESSAGES_BY_CODE[code]).not.toMatch(/\b(the|is|not|only)\b/)
  })
})
