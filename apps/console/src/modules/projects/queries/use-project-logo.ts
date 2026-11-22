import { useQuery } from '@tanstack/react-query'

import { readProjectLogo } from '@/modules/projects/api/read-project-logo'
import { blobToDataUrl } from '@/shared/lib/blob-to-data-url'

/** Not under `['projects']`: refreshing the project list must not download every logo again. */
export function projectLogoKey(projectId: string, version: string): readonly string[] {
  return ['project-logo', projectId, version]
}

/**
 * The logo as an image URL, or `undefined` while there is none or it loads. The version is in the
 * key, so a new upload is a new entry and an old one never changes.
 */
export function useProjectLogo(projectId: string, version: string | null): string | undefined {
  const logo = useQuery({
    queryKey: projectLogoKey(projectId, version ?? ''),
    queryFn: async () => blobToDataUrl(await readProjectLogo(projectId)),
    enabled: version !== null,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  })

  if (version === null) {
    return undefined
  }

  return logo.data
}
