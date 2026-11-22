import { Ellipsis as MenuDots, Trash2 as TrashBin } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import type { StorageBucket } from '@/modules/storage/api/storage-types'
import { useDeleteBucket } from '@/modules/storage/queries/use-storage-bucket-mutations'
import { ConfirmDialog } from '@/shared/ui/confirm-dialog'
import { Button } from '@/shared/ui/primitives/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/primitives/dropdown-menu'

type DeleteBucketMenuProps = { projectId: string; bucket: StorageBucket }

/** The bucket's menu; deleting it asks first, since its files go with it. */
export function DeleteBucketMenu({ projectId, bucket }: DeleteBucketMenuProps): JSX.Element {
  const [isConfirming, setIsConfirming] = useState(false)
  const deletion = useDeleteBucket(projectId)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`Ações do bucket ${bucket.name}`}
          >
            <MenuDots aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem variant="destructive" onSelect={() => setIsConfirming(true)}>
            <TrashBin aria-hidden />
            Excluir bucket
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        isOpen={isConfirming}
        onOpenChange={setIsConfirming}
        title="Excluir bucket?"
        description={`O bucket “${bucket.name}” e todos os arquivos nele serão excluídos.`}
        confirmLabel="Excluir bucket"
        isDestructive
        onConfirm={() => deletion.mutateAsync(bucket.id)}
      />
    </>
  )
}
