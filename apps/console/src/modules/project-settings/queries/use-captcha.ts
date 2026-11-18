import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { readCaptcha } from '@/modules/project-settings/api/read-captcha'
import { removeCaptcha } from '@/modules/project-settings/api/remove-captcha'
import { saveCaptcha } from '@/modules/project-settings/api/save-captcha'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

function captchaKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'captcha']
}

export function useCaptchaQuery(projectId: string): UseQueryResult<Schemas['CaptchaSettingsView']> {
  return useQuery({ queryKey: captchaKey(projectId), queryFn: () => readCaptcha(projectId) })
}

export function useSaveCaptchaMutation(
  projectId: string,
): UseMutationResult<Schemas['CaptchaSettingsView'], Error, Schemas['CaptchaSettingsBody']> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body) => saveCaptcha(projectId, body),
    onSuccess: (view) => queryClient.setQueryData(captchaKey(projectId), view),
  })
}

export function useRemoveCaptchaMutation(projectId: string): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => removeCaptcha(projectId),
    onSuccess: () => queryClient.setQueryData(captchaKey(projectId), { site_key: null }),
  })
}
