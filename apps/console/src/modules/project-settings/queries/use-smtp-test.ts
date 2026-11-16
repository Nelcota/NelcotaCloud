import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import { sendSmtpTest } from '@/modules/project-settings/api/send-smtp-test'

export function useSmtpTestMutation(projectId: string): UseMutationResult<void, Error, string> {
  return useMutation({ mutationFn: (to: string) => sendSmtpTest(projectId, to) })
}
