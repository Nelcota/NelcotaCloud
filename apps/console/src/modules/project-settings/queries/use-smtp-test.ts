import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import { type SmtpTestRequest, sendSmtpTest } from '@/modules/project-settings/api/send-smtp-test'

/** A test email through the saved server, or through `server` before it is saved. */
export function useSmtpTestMutation(
  projectId: string,
): UseMutationResult<void, Error, SmtpTestRequest> {
  return useMutation({ mutationFn: (body: SmtpTestRequest) => sendSmtpTest(projectId, body) })
}
