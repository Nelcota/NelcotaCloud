import Filter from '~icons/solar/filter-linear'
import FilterClose from '~icons/solar/filter-close-linear'
import type { JSX, ReactNode } from 'react'
import { useRef } from 'react'

import { ChoiceMenu } from '@/modules/activity/components/choice-menu'
import { PeriodPicker } from '@/modules/activity/components/period-picker'
import type { ActivityFilter } from '@/modules/activity/model/activity-search'
import { Button } from '@/shared/ui/button'
import { SearchInput } from '@/shared/ui/search-input'
import { useSlashShortcut } from '@/shared/ui/use-slash-shortcut'

const KIND_OPTIONS: readonly {
  value: ActivityFilter['kind']
  label: string
  shortLabel: string
}[] = [
  { value: 'all', label: 'Todos os eventos', shortLabel: 'Todos os tipos' },
  { value: 'logins', label: 'Logins', shortLabel: 'Logins' },
  { value: 'failures', label: 'Logins recusados', shortLabel: 'Recusados' },
  { value: 'security', label: 'Alertas de segurança', shortLabel: 'Segurança' },
  { value: 'account', label: 'Conta do usuário', shortLabel: 'Conta' },
  { value: 'changes', label: 'Alterações em usuários', shortLabel: 'Alterações' },
  { value: 'project', label: 'Alterações no projeto', shortLabel: 'Projeto' },
]

type ActivityToolbarProps = {
  filter: ActivityFilter
  onChange: (filter: ActivityFilter) => void
  /** What acts on the filtered events (the export), last in the row. */
  action: ReactNode
}

/** Every way to narrow the page, in one row: search first, then what and when, then export. */
export function ActivityToolbar({ filter, onChange, action }: ActivityToolbarProps): JSX.Element {
  const searchRef = useRef<HTMLInputElement>(null)
  useSlashShortcut(searchRef)

  // A size container: one row when it fits, otherwise search on top and the menus sharing the
  // row below, so the controls never stack four deep on a phone.
  return (
    <div className="@container">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full @3xl:w-auto @3xl:max-w-xl @3xl:flex-1">
          <SearchInput
            ref={searchRef}
            label="Buscar por e-mail ou IP"
            size="lg"
            keyShortcut="/"
            value={filter.search}
            onChange={(search) => onChange({ ...filter, search })}
          />
        </div>
        <ChoiceMenu
          label="Tipo de evento"
          icon={Filter}
          options={KIND_OPTIONS}
          value={filter.kind}
          onChange={(kind) => onChange({ ...filter, kind })}
          className="min-w-36 flex-1 @3xl:ml-auto @3xl:flex-none"
        />
        <PeriodPicker
          period={filter.period}
          onChange={(period) => onChange({ ...filter, period })}
          className="shrink-0"
        />
        <ClearButton
          filter={filter}
          onClear={() => onChange({ ...filter, kind: 'all', search: '' })}
        />
        {action}
      </div>
    </div>
  )
}

function ClearButton(props: { filter: ActivityFilter; onClear: () => void }): JSX.Element | null {
  if (props.filter.kind === 'all' && props.filter.search === '') {
    return null
  }

  return (
    <Button
      variant="destructive"
      size="lg"
      className="border-destructive/40 order-last h-11 @3xl:order-none"
      onClick={props.onClear}
    >
      <FilterClose data-icon="inline-start" aria-hidden="true" />
      Limpar filtros
    </Button>
  )
}
