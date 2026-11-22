import type { UseMutationResult } from '@tanstack/react-query'

import type { TestSend } from '@/modules/webhooks/api/send-test-webhook'
import type { components } from '@/shared/api/api-schema'

export type EndpointTestSend = UseMutationResult<
  components['schemas']['TestDeliveryResult'],
  Error,
  TestSend
>

/** Whether a test is on its way or its answer is still on screen. */
export function isTestShown(test: EndpointTestSend): boolean {
  return test.isPending || test.data !== undefined || test.error !== null
}
