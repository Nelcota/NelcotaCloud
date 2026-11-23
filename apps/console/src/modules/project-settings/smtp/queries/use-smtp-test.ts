import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import {
  type SmtpTestRequest,
  sendSmtpTest,
} from '@/modules/project-settings/smtp/api/send-smtp-test'

export function useSmtpTestMutation(
  projectId: string,
): UseMutationResult<void, Error, SmtpTestRequest> {
  return useMutation({ mutationFn: (request: SmtpTestRequest) => sendSmtpTest(projectId, request) })
}
