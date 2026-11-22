import type { AuditFilter } from '@/modules/activity/api/list-audit-events'
import { dayKey } from '@/modules/activity/components/audit-dates'
import { useExportAuditEventsMutation } from '@/modules/activity/queries/use-export-audit-events-mutation'
import { useCurrentProject } from '@/modules/projects/queries/use-projects'
import { saveDownload } from '@/modules/storage/components/save-download'

type CsvExport = { run: (filter: AuditFilter) => Promise<void>; isPending: boolean }

/** Downloads every event that matches the filters as `atividade-<slug>-<day>.csv`. */
export function useCsvExport(projectId: string, onError: (error: Error | null) => void): CsvExport {
  const exporter = useExportAuditEventsMutation(projectId)
  const slug = useCurrentProject(projectId)?.slug ?? 'projeto'

  async function run(filter: AuditFilter): Promise<void> {
    onError(null)

    try {
      const csv = await exporter.mutateAsync(filter)
      const today = dayKey(new Date().toISOString())
      saveDownload(csv, `atividade-${slug}-${today}.csv`)
    } catch (failure) {
      onError(asError(failure))
    }
  }

  return { run, isPending: exporter.isPending }
}

function asError(failure: unknown): Error {
  if (failure instanceof Error) {
    return failure
  }

  return new Error(String(failure))
}
