import { type UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query'

import { removeLogo } from '@/modules/project-settings/api/remove-logo'
import { uploadLogo } from '@/modules/project-settings/api/upload-logo'
import { settingsKey } from '@/modules/project-settings/queries/use-project-settings'
import type { components } from '@/shared/api/api-schema'
import { cropImage, type ImageSelection } from '@/shared/lib/crop-image'

type LogoView = components['schemas']['ProjectLogoView']

/** The settings and the project list carry the logo's version; refreshing them redraws every mark. */
function useRefreshProjects(projectId: string): () => Promise<void> {
  const queryClient = useQueryClient()

  return async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['projects'], exact: true }),
      queryClient.invalidateQueries({ queryKey: settingsKey(projectId) }),
    ])
  }
}

export function useUploadLogoMutation(
  projectId: string,
): UseMutationResult<LogoView, Error, ImageSelection> {
  const refreshProjects = useRefreshProjects(projectId)

  return useMutation({
    mutationFn: async (selection: ImageSelection) => {
      const image = await cropImage(selection.file, selection.area)

      return uploadLogo(projectId, image)
    },
    onSuccess: refreshProjects,
  })
}

export function useRemoveLogoMutation(projectId: string): UseMutationResult<void, Error, void> {
  const refreshProjects = useRefreshProjects(projectId)

  return useMutation({ mutationFn: () => removeLogo(projectId), onSuccess: refreshProjects })
}
