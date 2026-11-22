import { Database } from 'lucide-react'
import type { JSX } from 'react'

import { EmptyState } from '@/shared/ui/empty-state'

/** A schema without tables; "Nova tabela" and the SQL editor are in the page header. */
export function TablesEmptyState(): JSX.Element {
  return (
    <EmptyState
      isFramed
      icon={<Database aria-hidden />}
      title="Nenhuma tabela em public"
      description="Crie a primeira em Nova tabela ou pelo Editor SQL; ela já nasce com RLS ligado."
    />
  )
}
