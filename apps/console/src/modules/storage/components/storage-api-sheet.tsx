import type { JSX } from 'react'

import { usePublishableKey } from '@/modules/database/queries/use-publishable-key'
import { storageSnippets } from '@/modules/storage/components/storage-snippets'
import { ApiSheet } from '@/shared/ui/api-sheet'

type StorageApiSheetProps = { projectId: string; bucketId: string | null }

/** Listing, uploading, downloading and deleting files from the app, as the signed-in user. */
export function StorageApiSheet({ projectId, bucketId }: StorageApiSheetProps): JSX.Element | null {
  const publishableKey = usePublishableKey(projectId)

  return (
    <ApiSheet
      title="Arquivos pela API"
      description="Os arquivos são privados: cada pedido leva o token do usuário logado."
      snippets={storageSnippets({ bucketId, publishableKey })}
    />
  )
}
