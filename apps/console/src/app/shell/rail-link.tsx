import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'
import { RouterLink } from '@/shared/routing/router-link'
import type { IconComponent } from '@/shared/ui/icon-component'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip'

type RailLinkProps = {
  href: string
  label: string
  icon: IconComponent
  isCurrent: boolean
}

/** One icon of the rail, named by its tooltip and its accessible label. */
export function RailLink({ href, label, icon: Glyph, isCurrent }: RailLinkProps): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <RouterLink
          href={href}
          aria-label={label}
          aria-current={isCurrent ? 'page' : undefined}
          className={cn(
            'grid size-10 place-items-center rounded-[10px] text-muted-foreground hover:bg-surface hover:text-foreground',
            isCurrent && 'bg-surface-hover text-foreground',
          )}
        >
          <Glyph aria-hidden className="size-[18px]" />
        </RouterLink>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  )
}
