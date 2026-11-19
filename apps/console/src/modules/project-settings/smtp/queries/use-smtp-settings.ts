import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { readSmtp } from '@/modules/project-settings/smtp/api/read-smtp'
import { resetSmtp } from '@/modules/project-settings/smtp/api/reset-smtp'
import { saveSmtp } from '@/modules/project-settings/smtp/api/save-smtp'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

function smtpKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'smtp']
}

export function useSmtpQuery(projectId: string): UseQueryResult<Schemas['SmtpSettingsView']> {
  return useQuery({ queryKey: smtpKey(projectId), queryFn: () => readSmtp(projectId) })
}

export function useSaveSmtpMutation(
  projectId: string,
): UseMutationResult<Schemas['SmtpSettingsView'], Error, Schemas['SmtpSettingsBody']> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: Schemas['SmtpSettingsBody']) => saveSmtp(projectId, body),
    onSuccess: (view) => queryClient.setQueryData(smtpKey(projectId), view),
  })
}

export function useResetSmtpMutation(projectId: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => resetSmtp(projectId),
    // Not awaited: the confirmation closes first, then the page swaps its button for the new state.
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: smtpKey(projectId) })
    },
  })
}
