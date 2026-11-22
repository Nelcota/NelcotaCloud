import { Play } from 'lucide-react'
import type { JSX, KeyboardEvent } from 'react'

import type { ActivityFiltersControl } from '@/modules/activity/components/use-activity-filters'
import { Button } from '@/shared/ui/primitives/button'
import { Kbd } from '@/shared/ui/primitives/kbd'
import { SearchField } from '@/shared/ui/search-field'

const IS_APPLE = /Mac|iPad|iPhone/u.test(navigator.userAgent)

type LogQueryFormProps = { control: ActivityFiltersControl; onRun: () => void }

/** The search the API applies (email or IP), run while typing or at once with Ctrl+Enter. */
export function LogQueryForm({ control, onRun }: LogQueryFormProps): JSX.Element {
  function runOnShortcut(key: KeyboardEvent<HTMLFormElement>): void {
    if (key.key !== 'Enter' || (key.ctrlKey === false && key.metaKey === false)) {
      return
    }

    key.preventDefault()
    onRun()
  }

  return (
    <form
      role="search"
      className="flex flex-col gap-2"
      onKeyDown={runOnShortcut}
      onSubmit={(submit) => {
        submit.preventDefault()
        onRun()
      }}
    >
      <h3 className="font-mono text-2xs font-medium text-muted-foreground uppercase">Busca</h3>
      <SearchField
        label="Buscar por email ou IP"
        className="sm:max-w-none"
        value={control.filters.searchText}
        onValueChange={control.setSearchText}
      />
      <Button type="submit" variant="secondary" className="w-full font-mono">
        <Play aria-hidden data-icon="inline-start" />
        Executar
        <Kbd className="font-mono">{shortcutLabel()}</Kbd>
      </Button>
    </form>
  )
}

function shortcutLabel(): string {
  if (IS_APPLE) {
    return '⌘↵'
  }

  return 'Ctrl ↵'
}
