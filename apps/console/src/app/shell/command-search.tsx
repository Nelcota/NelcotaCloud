import { Search } from 'lucide-react'
import type { JSX } from 'react'
import { useCallback, useState } from 'react'

import { CommandPalette } from '@/app/shell/command-palette'
import { useCommandShortcut } from '@/app/shell/use-command-shortcut'
import { Kbd } from '@/shared/ui/primitives/kbd'

const IS_APPLE = /Mac|iPad|iPhone/u.test(navigator.userAgent)

/** The search box of the top bar, also opened with Ctrl+K (⌘K). */
export function CommandSearch({ projectId }: { projectId: string | null }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const toggle = useCallback(() => setIsOpen((current) => current === false), [])

  useCommandShortcut(toggle)

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label="Buscar"
        onClick={open}
        className="flex h-10 items-center gap-2 rounded-md bg-surface px-2.5 text-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground sm:w-44 sm:px-3 xl:w-60"
      >
        <Search aria-hidden className="size-5" />
        <span className="hidden sm:inline">Buscar…</span>
        <Kbd className="ms-auto hidden sm:inline-flex">{shortcutLabel()}</Kbd>
      </button>
      <CommandPalette projectId={projectId} isOpen={isOpen} onOpenChange={setIsOpen} />
    </>
  )
}

function shortcutLabel(): string {
  if (IS_APPLE) {
    return '⌘K'
  }

  return 'Ctrl K'
}
