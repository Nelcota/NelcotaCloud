import type { JSX } from 'react'

import { formatDuration } from '@/modules/webhooks/components/format-duration'
import type { EndpointTestSend } from '@/modules/webhooks/components/test-send-state'
import { ApiError } from '@/shared/api/api-error'
import type { components } from '@/shared/api/api-schema'
import { describeError } from '@/shared/api/describe-error'
import { Button } from '@/shared/ui/primitives/button'
import type { NoticeTone } from '@/shared/ui/notice'
import { SummarySentence } from '@/shared/ui/summary-sentence'

type TestDeliveryResult = components['schemas']['TestDeliveryResult']

const TOO_MANY_REQUESTS = 429
/** Enough of a refusal to recognize the receiver's error; the full start is in the log. */
const MAX_EXCERPT_SHOWN = 160

type TestReading = { tone: NoticeTone; verdict: string; sentence: string }

/** The test's answer where the health usually is: received, refused, or not sent at all. */
export function TestResultStrip({ test }: { test: EndpointTestSend }): JSX.Element {
  const reading = readingOf(test)

  return (
    <SummarySentence
      tone={reading.tone}
      verdict={reading.verdict}
      action={<CloseButton test={test} />}
    >
      <span className="tabular-nums wrap-anywhere">{reading.sentence}</span>
    </SummarySentence>
  )
}

function CloseButton({ test }: { test: EndpointTestSend }): JSX.Element | null {
  if (test.isPending) {
    return null
  }

  return (
    <Button type="button" size="sm" variant="ghost" onClick={() => test.reset()}>
      Fechar
    </Button>
  )
}

function readingOf(test: EndpointTestSend): TestReading {
  const error = test.error
  const result = test.data

  if (error !== null) {
    return refusedRequest(error)
  }

  if (result === undefined) {
    return {
      tone: 'info',
      verdict: 'Enviando teste.',
      sentence: 'Esperando a resposta do servidor.',
    }
  }

  if (result.delivered) {
    return { tone: 'success', verdict: 'Teste recebido.', sentence: `${answerOf(result)}.` }
  }

  return { tone: 'error', verdict: 'Teste recusado.', sentence: refusalOf(result) }
}

/** The API did not send it: a rate limit is a wait, anything else a failure. */
function refusedRequest(error: Error): TestReading {
  if (error instanceof ApiError && error.status === TOO_MANY_REQUESTS) {
    return { tone: 'warning', verdict: 'Aguarde.', sentence: describeError(error) }
  }

  return { tone: 'error', verdict: 'Teste não enviado.', sentence: describeError(error) }
}

/** "HTTP 200 em 120 ms", or why no answer came. */
function answerOf(result: TestDeliveryResult): string {
  const status = result.response_status
  const duration = result.duration_ms

  if (status === null || status === undefined) {
    return `Sem resposta: ${result.error ?? 'o servidor não respondeu'}`
  }

  if (duration === null || duration === undefined) {
    return `HTTP ${status}`
  }

  return `HTTP ${status} em ${formatDuration(duration)}`
}

function refusalOf(result: TestDeliveryResult): string {
  const excerpt = result.response_excerpt ?? ''

  if (excerpt === '') {
    return `${answerOf(result)}.`
  }

  return `${answerOf(result)}: ${shortened(excerpt)}`
}

function shortened(text: string): string {
  if (text.length <= MAX_EXCERPT_SHOWN) {
    return text
  }

  return `${text.slice(0, MAX_EXCERPT_SHOWN)}…`
}
