import { SunMoon } from 'lucide-react'
import type { JSX } from 'react'

import { type CommandItem as CommandEntry, filterCommands } from '@/app/shell/command-items'
import { useThemeMode } from '@/shared/theme/use-theme-mode'
import { CommandGroup, CommandItem } from '@/shared/ui/primitives/command'

const THEME_ACTION_LABELS = { dark: 'Usar tema claro', light: 'Usar tema escuro' } as const

/** The one action of the palette: switching the theme, found by "tema", "claro" or "escuro". */
export function ThemeCommand({
  query,
  onDone,
}: {
  query: string
  onDone: () => void
}): JSX.Element | null {
  const { mode, toggleMode } = useThemeMode()
  const label = THEME_ACTION_LABELS[mode]
  const matches = filterWords(`${label} tema`, query)

  if (matches === false) {
    return null
  }

  return (
    <CommandGroup heading="Ações">
      <CommandItem
        value="action-theme"
        onSelect={() => {
          toggleMode()
          onDone()
        }}
      >
        <SunMoon aria-hidden className="text-muted-foreground" />
        <span className="truncate">{label}</span>
      </CommandItem>
    </CommandGroup>
  )
}

function filterWords(text: string, query: string): boolean {
  const entry: CommandEntry = {
    id: 'action',
    label: text,
    context: '',
    to: '',
    group: 'console',
    mark: { kind: 'icon', icon: SunMoon },
  }

  return filterCommands([entry], query).length > 0
}
