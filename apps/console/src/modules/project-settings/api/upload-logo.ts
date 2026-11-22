import { apiClient, projectHeaders } from '@/shared/api/api-client'
import { dataOf } from '@/shared/api/api-result'
import type { components } from '@/shared/api/api-schema'

const IMAGE_HEADERS = { 'content-type': 'application/octet-stream' }

/** The server crops to a centered square too, so send the part the user chose. */
export async function uploadLogo(
  projectId: string,
  image: Blob,
): Promise<components['schemas']['ProjectLogoView']> {
  const headers = { ...projectHeaders(projectId), ...IMAGE_HEADERS }

  return dataOf(
    await apiClient.PUT('/auth/v1/admin/logo', {
      headers,
      // The schema names the file a binary string; the serializer sends the image itself.
      body: '',
      bodySerializer: () => image,
    }),
  )
}
