import type { User } from '@nelcota/sdk'
import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import { removeAvatar } from '@/modules/account/api/remove-avatar'
import { uploadAvatar } from '@/modules/account/api/upload-avatar'
import { cropImage, type ImageSelection } from '@/shared/lib/crop-image'

/** The SDK updates the session user, so every avatar on screen follows without a refetch. */
export function useUploadAvatarMutation(): UseMutationResult<User, Error, ImageSelection> {
  return useMutation({
    mutationFn: async (selection: ImageSelection) => {
      const image = await cropImage(selection.file, selection.area)

      return uploadAvatar(image)
    },
  })
}

export function useRemoveAvatarMutation(): UseMutationResult<void, Error, void> {
  return useMutation({ mutationFn: () => removeAvatar() })
}
