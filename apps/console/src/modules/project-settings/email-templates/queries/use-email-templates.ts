import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { listEmailTemplates } from '@/modules/project-settings/email-templates/api/list-email-templates'
import { resetEmailTemplate } from '@/modules/project-settings/email-templates/api/reset-email-template'
import {
  type EmailKind,
  type EmailTemplateChange,
  saveEmailTemplate,
} from '@/modules/project-settings/email-templates/api/save-email-template'
import type { components } from '@/shared/api/api-schema'

type EmailTemplateView = components['schemas']['EmailTemplateView']

function templatesKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'email-templates']
}

export function useEmailTemplatesQuery(projectId: string): UseQueryResult<EmailTemplateView[]> {
  return useQuery({
    queryKey: templatesKey(projectId),
    queryFn: () => listEmailTemplates(projectId),
  })
}

export function useSaveEmailTemplateMutation(
  projectId: string,
): UseMutationResult<EmailTemplateView, Error, EmailTemplateChange> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (change) => saveEmailTemplate(projectId, change),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey(projectId) }),
  })
}

export function useResetEmailTemplateMutation(
  projectId: string,
): UseMutationResult<EmailTemplateView, Error, EmailKind> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (kind) => resetEmailTemplate(projectId, kind),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: templatesKey(projectId) }),
  })
}
