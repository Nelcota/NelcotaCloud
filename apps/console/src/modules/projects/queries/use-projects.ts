import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { createProject } from '@/modules/projects/api/create-project'
import { deleteProject } from '@/modules/projects/api/delete-project'
import { listProjects } from '@/modules/projects/api/list-projects'
import { PROJECT_CATALOG_KEY, projectDataKey } from '@/modules/projects/queries/project-catalog-key'
import type { components } from '@/shared/api/api-schema'

type Schemas = components['schemas']

export function useProjectsQuery(): UseQueryResult<Schemas['ProjectSummary'][]> {
  return useQuery({ queryKey: PROJECT_CATALOG_KEY, queryFn: listProjects })
}

/** The project with this id from the projects list; undefined while it loads. */
export function useCurrentProject(projectId: string): Schemas['ProjectSummary'] | undefined {
  const projects = useProjectsQuery()

  return projects.data?.find((project) => project.id === projectId)
}

export function useCreateProjectMutation(): UseMutationResult<
  Schemas['CreatedTenantResponse'],
  Error,
  Schemas['CreateTenantBody']
> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProject,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: PROJECT_CATALOG_KEY, exact: true }),
  })
}

export function useDeleteProjectMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteProject,
    onSuccess: async (_result, projectId) => {
      queryClient.removeQueries({ queryKey: projectDataKey(projectId) })
      await queryClient.invalidateQueries({ queryKey: PROJECT_CATALOG_KEY, exact: true })
    },
  })
}
