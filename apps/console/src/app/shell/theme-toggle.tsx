import { Moon, Sun } from 'lucide-react'
import type { JSX } from 'react'

import type { ThemeMode } from '@/shared/theme/theme-mode'
import { useThemeMode } from '@/shared/theme/use-theme-mode'
import { Button } from '@/shared/ui/primitives/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip'

const NEXT_THEME: Record<ThemeMode, { label: string; icon: typeof Sun }> = {
  dark: { label: 'Usar tema claro', icon: Sun },
  light: { label: 'Usar tema escuro', icon: Moon },
}

/** Switches between the dark and the light theme. */
export function ThemeToggle(): JSX.Element {
  const { mode, toggleMode } = useThemeMode()
  const { label, icon: Glyph } = NEXT_THEME[mode]

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10"
          aria-label={label}
          onClick={toggleMode}
        >
          <Glyph aria-hidden className="size-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
