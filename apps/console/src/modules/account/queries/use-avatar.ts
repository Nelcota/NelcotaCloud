import type { User } from '@nelcota/sdk'
import { type UseMutationResult, useMutation } from '@tanstack/react-query'

import { removeAvatar } from '@/modules/account/api/remove-avatar'
import { uploadAvatar } from '@/modules/account/api/upload-avatar'
import { cropImage, type PixelArea } from '@/shared/lib/crop-image'

/** The image the user picked and the square of it they chose in the editor. */
export type AvatarSelection = { file: Blob; area: PixelArea }

/** The SDK updates the session user, so every avatar on screen follows without a refetch. */
export function useUploadAvatarMutation(): UseMutationResult<User, Error, AvatarSelection> {
  return useMutation({
    mutationFn: async (selection: AvatarSelection) => {
      const image = await cropImage(selection.file, selection.area)

      return uploadAvatar(image)
    },
  })
}

export function useRemoveAvatarMutation(): UseMutationResult<void, Error, void> {
  return useMutation({ mutationFn: () => removeAvatar() })
}
