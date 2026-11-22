import { useNavigate } from '@tanstack/react-router'
import { useMemo, useState, type JSX } from 'react'

import {
  type CommandItem as CommandEntry,
  type CommandMark,
  commandItems,
  filterCommands,
  groupCommands,
} from '@/app/shell/command-items'
import { PaletteFooter } from '@/app/shell/command-palette-footer'
import { ThemeCommand } from '@/app/shell/command-theme-action'
import { ProjectAvatar } from '@/app/shell/project-avatar'
import { useProjectsQuery } from '@/modules/projects/queries/use-projects'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/shared/ui/primitives/command'
import { Kbd } from '@/shared/ui/primitives/kbd'

type CommandPaletteProps = {
  projectId: string | null
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
}

export function CommandPalette({
  projectId,
  isOpen,
  onOpenChange,
}: CommandPaletteProps): JSX.Element {
  const navigate = useNavigate()
  const projects = useProjectsQuery()
  const [query, setQuery] = useState('')
  const items = useMemo(
    () => commandItems({ projectId, projects: projects.data ?? [] }),
    [projectId, projects.data],
  )
  const groups = groupCommands(filterCommands(items, query))

  function changeOpen(isNowOpen: boolean): void {
    onOpenChange(isNowOpen)

    if (isNowOpen === false) {
      setQuery('')
    }
  }

  function open(item: CommandEntry): void {
    changeOpen(false)
    void navigate({ to: item.to })
  }

  return (
    <CommandDialog
      title="Buscar páginas e projetos"
      description="Digite o nome de uma página ou projeto."
      open={isOpen}
      onOpenChange={changeOpen}
    >
      <Command shouldFilter={false}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Ex.: Banco de dados"
          aria-label="Buscar páginas e projetos"
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado. Tente outro termo.</CommandEmpty>
          {groups.map((group) => (
            <CommandGroup key={group.id} heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem key={item.id} value={item.id} onSelect={() => open(item)}>
                  <CommandItemMark mark={item.mark} />
                  <span className="truncate">{item.label}</span>
                  <span data-slot="command-shortcut" className="ml-auto">
                    <Kbd className="hidden group-data-[selected=true]/command-item:inline-flex">
                      ↵
                    </Kbd>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
          <ThemeCommand query={query} onDone={() => changeOpen(false)} />
        </CommandList>
        <PaletteFooter />
      </Command>
    </CommandDialog>
  )
}

function CommandItemMark({ mark }: { mark: CommandMark }): JSX.Element {
  if (mark.kind === 'project') {
    return (
      <span aria-hidden className="flex">
        <ProjectAvatar name={mark.name} mascotId={mark.mascotId} size="xs" />
      </span>
    )
  }

  return <mark.icon aria-hidden className="text-muted-foreground" />
}
