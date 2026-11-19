import Download from '~icons/solar/download-linear'
import Trash from '~icons/solar/trash-bin-trash-linear'
import type { JSX } from 'react'

import type { StorageObject } from '@/modules/storage/api/storage-files'
import { useDownloadFile } from '@/modules/storage/queries/use-download-file'
import { useDeleteFile } from '@/modules/storage/queries/use-storage-objects'
import { Button } from '@/shared/ui/button'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { TableCell, TableRow } from '@/shared/ui/table'

const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

type StorageFileRowProps = { projectId: string; file: StorageObject }

export function StorageFileRow({ projectId, file }: StorageFileRowProps): JSX.Element {
  const download = useDownloadFile(projectId)
  const deletion = useDeleteFile(projectId, file.bucket_id)

  return (
    <TableRow>
      <th scope="row" className="min-w-0 px-3 py-2 text-left font-medium [overflow-wrap:anywhere]">
        {file.name}
        <span className="text-muted-foreground block text-xs font-normal sm:hidden">
          {sizeLabel(file.size_bytes)}
        </span>
      </th>
      <TableCell className="text-muted-foreground hidden tabular-nums sm:table-cell">
        {sizeLabel(file.size_bytes)}
      </TableCell>
      <TableCell className="w-px">
        <div className="flex justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            aria-label={`Baixar ${file.name}`}
            aria-busy={download.isPending}
            disabled={download.isPending}
            onClick={() => download.mutate(file.id)}
          >
            <Download aria-hidden="true" />
            <span className="hidden lg:inline">Baixar</span>
          </Button>
          <ConfirmButton
            title="Excluir arquivo?"
            description={`O arquivo “${file.name}” será removido do bucket.`}
            confirmLabel="Excluir arquivo"
            triggerLabel={`Excluir ${file.name}`}
            isDestructive
            onConfirm={() => deletion.mutateAsync(file.id)}
          >
            <Trash aria-hidden="true" />
            <span className="hidden lg:inline">Excluir</span>
          </ConfirmButton>
        </div>
        <ErrorAlert error={download.error} />
      </TableCell>
    </TableRow>
  )
}

function sizeLabel(bytes: number): string {
  if (bytes >= 1_048_576) {
    return `${numberFormat.format(bytes / 1_048_576)} MiB`
  }

  if (bytes >= 1024) {
    return `${numberFormat.format(bytes / 1024)} KiB`
  }

  return `${numberFormat.format(bytes)} B`
}
