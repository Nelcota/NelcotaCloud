import type { UseMutationResult } from '@tanstack/react-query'
import type { JSX } from 'react'

import { RequestErrorNotice } from '@/modules/webhooks/components/request-error-notice'
import type { components } from '@/shared/api/api-schema'
import { Notice } from '@/shared/ui/notice'

type TestDeliveryResult = components['schemas']['TestDeliveryResult']

type TestOutcomeProps = { test: UseMutationResult<TestDeliveryResult, Error, string> }

/** What happened to the test event sent from the menu: sending, received, refused or limited. */
export function TestOutcome({ test }: TestOutcomeProps): JSX.Element | null {
  if (test.isPending) {
    return <Notice tone="info" title="Enviando evento de teste…" />
  }

  if (test.error !== null) {
    return <RequestErrorNotice error={test.error} />
  }

  const result = test.data

  if (result === undefined) {
    return null
  }

  if (result.delivered) {
    return (
      <Notice
        tone="success"
        title={`Evento de teste recebido (HTTP ${result.response_status})`}
        onDismiss={() => test.reset()}
      />
    )
  }

  return (
    <Notice
      tone="error"
      title={`Evento de teste não recebido: ${failureReason(result)}`}
      onDismiss={() => test.reset()}
    />
  )
}

/** The receiver's status says more than the transport's English text, when there is one. */
function failureReason(result: TestDeliveryResult): string {
  const status = result.response_status

  if (status !== null && status !== undefined) {
    return `HTTP ${status}`
  }

  return result.error ?? 'sem resposta'
}
