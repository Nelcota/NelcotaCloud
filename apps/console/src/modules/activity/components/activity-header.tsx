import type { JSX } from 'react'
import { useState } from 'react'

import { activitySnippets } from '@/modules/activity/components/activity-api-snippets'
import { PERIOD_OPTIONS, parseDays } from '@/modules/activity/components/activity-filters'
import { CsvExportButton } from '@/modules/activity/components/csv-export-button'
import {
  type ActivityFiltersControl,
  auditFilterOf,
} from '@/modules/activity/components/use-activity-filters'
import { ApiSheet } from '@/shared/ui/api-sheet'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PageHeader } from '@/shared/ui/page-header'
import { SegmentedControl } from '@/shared/ui/segmented-control'

type ActivityHeaderProps = { projectId: string; control: ActivityFiltersControl }

/** The title, the period the whole page reads, the CSV export and the same log from code. */
export function ActivityHeader({ projectId, control }: ActivityHeaderProps): JSX.Element {
  const [exportError, setExportError] = useState<Error | null>(null)
  const filter = auditFilterOf(control.filters)

  return (
    <PageHeader
      title="Atividade"
      description="Logins, falhas e alterações do projeto, com IP e ID de cada requisição."
      actions={
        <>
          <SegmentedControl
            label="Período"
            isMono
            options={PERIOD_OPTIONS}
            value={String(control.filters.days)}
            onValueChange={(value) => {
              const days = parseDays(value)

              if (days !== null) {
                control.setDays(days)
              }
            }}
          />
          <CsvExportButton projectId={projectId} filter={filter} onError={setExportError} />
          <ApiSheet
            title="Atividade pela API"
            description="Rotas de administração: use a chave secreta, só no servidor."
            snippets={activitySnippets(filter)}
          />
        </>
      }
    >
      <ErrorAlert error={exportError} />
    </PageHeader>
  )
}
