import { useQueryClient } from '@tanstack/react-query'
import type { JSX } from 'react'
import { useState } from 'react'

import type { StorageBucket, StorageObject } from '@/modules/storage/api/storage-files'
import { StorageFileRow } from '@/modules/storage/components/storage-file-row'
import { UploadFileForm } from '@/modules/storage/components/upload-file-form'
import { useDeleteBucket } from '@/modules/storage/queries/use-storage-buckets'
import { objectKey, useStorageObjects } from '@/modules/storage/queries/use-storage-objects'
import { Button } from '@/shared/ui/button'
import { ConfirmButton } from '@/shared/ui/confirm-button'
import { LoadError } from '@/shared/ui/load-error'
import { Skeleton } from '@/shared/ui/skeleton'
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/shared/ui/table'

type StorageObjectsProps = { projectId: string; bucket: StorageBucket }

export function StorageObjects({ projectId, bucket }: StorageObjectsProps): JSX.Element {
  const [cursors, setCursors] = useState<string[]>([])
  const queryClient = useQueryClient()
  const files = useStorageObjects(projectId, bucket.id, cursors.at(-1) ?? null)
  const deletion = useDeleteBucket(projectId)
  const next = files.data?.next_cursor

  function showNewest(): void {
    const queryKey = objectKey(projectId, bucket.id)
    void queryClient.invalidateQueries({ queryKey, refetchType: 'none' })
    setCursors([])
    void queryClient.refetchQueries({ queryKey: [...queryKey, null], exact: true, type: 'active' })
  }

  return (
    <section aria-labelledby="storage-bucket-title" className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="storage-bucket-title"
          className="min-w-0 text-lg font-semibold [overflow-wrap:anywhere]"
        >
          {bucket.name}
        </h2>
        <ConfirmButton
          title="Excluir bucket?"
          description={`O bucket “${bucket.name}” e todos os arquivos nele serão excluídos.`}
          confirmLabel="Excluir bucket"
          isDestructive
          onConfirm={() => deletion.mutateAsync(bucket.id)}
        >
          Excluir bucket
        </ConfirmButton>
      </div>
      <UploadFileForm projectId={projectId} bucketId={bucket.id} onUploaded={showNewest} />
      <LoadError error={files.error} onRetry={() => files.refetch()} />
      {files.isPending && <Skeleton className="h-24 rounded-xl" />}
      {files.isSuccess && <FileTable objects={files.data.items} projectId={projectId} />}
      <div className="flex justify-end gap-2">
        {cursors.length > 0 && (
          <Button variant="outline" onClick={() => setCursors((trail) => trail.slice(0, -1))}>
            Anterior
          </Button>
        )}
        {files.isSuccess && typeof next === 'string' && (
          <Button variant="outline" onClick={() => setCursors((trail) => [...trail, next])}>
            Próxima
          </Button>
        )}
      </div>
    </section>
  )
}

function FileTable({
  objects,
  projectId,
}: {
  objects: StorageObject[]
  projectId: string
}): JSX.Element {
  if (objects.length === 0) {
    return (
      <p className="text-muted-foreground rounded-xl border border-dashed p-5 text-sm">
        Nenhum arquivo neste bucket.
      </p>
    )
  }

  return (
    <div className="bg-card rounded-xl border">
      <Table aria-label="Arquivos do bucket">
        <TableHeader>
          <TableRow>
            <TableHead scope="col" className="px-3">
              Nome
            </TableHead>
            <TableHead scope="col" className="hidden sm:table-cell">
              Tamanho
            </TableHead>
            <TableHead scope="col" className="text-right">
              Ações
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {objects.map((file) => (
            <StorageFileRow key={file.id} projectId={projectId} file={file} />
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
