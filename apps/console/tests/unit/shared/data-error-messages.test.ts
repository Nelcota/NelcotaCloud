import { describe, expect, it } from 'vitest'

import { ApiError } from '@/shared/api/api-error'
import { describeError } from '@/shared/api/describe-error'

function refusal(code: string, message: string): ApiError {
  return new ApiError({ status: 409, code, message })
}

describe('describeError for Data API refusals', () => {
  it('names the constraint or column that failed', () => {
    const duplicate = refusal(
      'unique_violation',
      'the value conflicts with unique constraint clientes_email_key',
    )
    const empty = refusal(
      'not_null_violation',
      'a required column was left empty (constraint nome)',
    )

    expect(describeError(duplicate)).toBe(
      'Já existe uma linha com esse valor (restrição clientes_email_key). Use outro valor.',
    )
    expect(describeError(empty)).toBe('A coluna nome é obrigatória. Preencha um valor.')
  })

  it('still explains a refusal whose name is missing', () => {
    const unnamed = refusal(
      'foreign_key_violation',
      'the row references or is referenced by another row (constraint )',
    )

    expect(describeError(unnamed)).toBe(
      'A linha aponta para outra que não existe, ou outra linha depende dela.',
    )
  })

  it('translates a value of the wrong type instead of the generic message', () => {
    const wrongType = refusal('invalid_value', "a value does not match its column's type")

    expect(describeError(wrongType)).toContain('tipo da coluna')
  })
})
