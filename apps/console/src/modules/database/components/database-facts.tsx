import type { JSX } from 'react'

import { API_BASE_URL } from '@/shared/api/api-base-url'
import { IdChip } from '@/shared/ui/id-chip'

/** Where apps reach the tables, and the only schema the Data API serves. */
export function DatabaseFacts(): JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <IdChip label="Endpoint REST" value={`${API_BASE_URL}/rest/v1`} isLabelVisible />
      <IdChip label="Schema" value="public" isLabelVisible />
    </div>
  )
}
