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

  useCommandShortcut(open, isOpen === false)

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-label="Buscar"
        onClick={open}
        className="flex h-9 items-center gap-2 rounded-md bg-surface px-2.5 text-sm text-muted-foreground hover:bg-surface-hover hover:text-foreground sm:w-60 sm:px-3"
      >
        <Search aria-hidden className="size-4" />
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
