import type { JSX } from 'react'

import type { StorageObject } from '@/modules/storage/api/storage-types'
import { StorageFileActions } from '@/modules/storage/components/storage-file-actions'
import { sizeLabel } from '@/modules/storage/components/storage-size'
import { EmptyState } from '@/shared/ui/empty-state'
import { IdChip } from '@/shared/ui/id-chip'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/ui/primitives/table'

type StorageFileTableProps = { objects: StorageObject[]; projectId: string }

/** One row per file: name, type, size, the id the API addresses it by, then download and delete. */
export function StorageFileTable({ objects, projectId }: StorageFileTableProps): JSX.Element {
  if (objects.length === 0) {
    return <EmptyState isCompact title="Nenhum arquivo neste bucket" />
  }

  return (
    <Table aria-label="Arquivos do bucket">
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead className="text-right">Tamanho</TableHead>
          <TableHead>ID</TableHead>
          <TableHead className="w-24">
            <span className="sr-only">Ações</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {objects.map((file) => (
          <TableRow key={file.id}>
            <TableCell className="max-w-64 py-2.5">
              <span title={file.name} className="block truncate font-medium text-heading">
                {file.name}
              </span>
            </TableCell>
            <TableCell className="max-w-40 truncate font-mono text-xs text-muted-foreground">
              {file.content_type}
            </TableCell>
            <TableCell className="text-right text-muted-foreground tabular-nums">
              {sizeLabel(file.size_bytes)}
            </TableCell>
            <TableCell className="max-w-48">
              <IdChip label={`ID de ${file.name}`} value={file.id} />
            </TableCell>
            <TableCell className="py-1.5">
              <StorageFileActions projectId={projectId} file={file} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
