import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { readSettings } from '@/modules/project-settings/general/api/read-settings'
import { updateSettings } from '@/modules/project-settings/general/api/update-settings'
import { PROJECT_CATALOG_KEY } from '@/modules/projects/queries/project-catalog-key'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

function settingsKey(projectId: string): readonly string[] {
  return ['projects', projectId, 'settings']
}

export function useSettingsQuery(projectId: string): UseQueryResult<Schemas['TenantSettings']> {
  return useQuery({ queryKey: settingsKey(projectId), queryFn: () => readSettings(projectId) })
}

export function useUpdateSettingsMutation(
  projectId: string,
): UseMutationResult<Schemas['TenantSettings'], Error, Schemas['TenantSettingsBody']> {
  const queryClient = useQueryClient()

  return useMutation({
    scope: { id: `project-settings:${projectId}` },
    mutationFn: (body: Schemas['TenantSettingsBody']) => updateSettings(projectId, body),
    onSuccess: async (settings) => {
      queryClient.setQueryData(settingsKey(projectId), settings)
      queryClient.setQueryData<Schemas['ProjectSummary'][]>(PROJECT_CATALOG_KEY, (projects) =>
        projects?.map((project) => {
          if (project.id !== projectId) {
            return project
          }

          return { ...project, ...settings }
        }),
      )
      await queryClient.invalidateQueries({ queryKey: PROJECT_CATALOG_KEY, exact: true })
    },
  })
}
