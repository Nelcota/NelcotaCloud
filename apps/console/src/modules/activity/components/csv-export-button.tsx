import Download from '~icons/solar/download-minimalistic-linear'
import type { JSX } from 'react'

import type { AuditFilter } from '@/modules/activity/api/list-audit-events'
import { useCsvExport } from '@/modules/activity/components/use-csv-export'
import { PendingButton } from '@/shared/ui/pending-button'

type CsvExportButtonProps = {
  projectId: string
  filter: AuditFilter
  onError: (error: Error | null) => void
}

/** Downloads every event that matches the filters on screen, not only the loaded pages. */
export function CsvExportButton({ projectId, filter, onError }: CsvExportButtonProps): JSX.Element {
  const exportCsv = useCsvExport(projectId, onError)

  return (
    <PendingButton
      type="button"
      variant="outline"
      isPending={exportCsv.isPending}
      onClick={() => void exportCsv.run(filter)}
    >
      <Download aria-hidden data-icon="inline-start" />
      Exportar CSV
    </PendingButton>
  )
}
