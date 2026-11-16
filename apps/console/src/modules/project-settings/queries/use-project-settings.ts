import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { readSettings } from '@/modules/project-settings/api/read-settings'
import { readSmtp } from '@/modules/project-settings/api/read-smtp'
import { resetSmtp } from '@/modules/project-settings/api/reset-smtp'
import { saveSmtp } from '@/modules/project-settings/api/save-smtp'
import { updateSettings } from '@/modules/project-settings/api/update-settings'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

function settingsKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'settings']
}

function smtpKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'smtp']
}

export function useSettingsQuery(projectId: string): UseQueryResult<Schemas['TenantSettings']> {
  return useQuery({ queryKey: settingsKey(projectId), queryFn: () => readSettings(projectId) })
}

export function useUpdateSettingsMutation(
  projectId: string,
): UseMutationResult<Schemas['TenantSettings'], Error, Schemas['TenantSettingsBody']> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: Schemas['TenantSettingsBody']) => updateSettings(projectId, body),
    onSuccess: (settings) => {
      queryClient.setQueryData(settingsKey(projectId), settings)
      void queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: smtpKey(projectId) }),
  })
}
