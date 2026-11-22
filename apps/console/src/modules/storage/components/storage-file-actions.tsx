import { Download, Trash2 as Trash } from 'lucide-react'
import type { JSX } from 'react'

import type { StorageObject } from '@/modules/storage/api/storage-types'
import { saveDownload } from '@/modules/storage/components/save-download'
import {
  useDeleteFile,
  useDownloadFile,
} from '@/modules/storage/queries/use-storage-object-mutations'
import { describeError } from '@/shared/api/describe-error'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { PendingButton } from '@/shared/ui/pending-button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip'

type StorageFileActionsProps = { projectId: string; file: StorageObject }

/** Download and delete for one file; a failed download says why in the row. */
export function StorageFileActions({ projectId, file }: StorageFileActionsProps): JSX.Element {
  const download = useDownloadFile(projectId)
  const deletion = useDeleteFile(projectId, file.bucket_id)

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <PendingButton
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Baixar ${file.name}`}
              isPending={download.isPending}
              onClick={() =>
                download.mutate(file.id, { onSuccess: (blob) => saveDownload(blob, file.name) })
              }
            >
              <Download aria-hidden />
            </PendingButton>
          </TooltipTrigger>
          <TooltipContent>Baixar</TooltipContent>
        </Tooltip>
        <ConfirmButton
          label={`Excluir ${file.name}`}
          icon={Trash}
          isIconOnly
          title="Excluir arquivo?"
          description={`O arquivo “${file.name}” será removido do bucket.`}
          confirmLabel="Excluir arquivo"
          isDestructive
          isPending={deletion.isPending}
          onConfirm={() => deletion.mutateAsync(file.id)}
        />
      </div>
      <DownloadError error={download.error} />
    </div>
  )
}

function DownloadError({ error }: { error: Error | null }): JSX.Element | null {
  if (error === null) {
    return null
  }

  return (
    <p role="alert" className="max-w-56 text-right text-xs whitespace-normal text-destructive">
      {describeError(error)}
    </p>
  )
}
