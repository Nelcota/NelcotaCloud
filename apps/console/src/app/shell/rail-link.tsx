import { Link } from '@tanstack/react-router'
import type { JSX } from 'react'

import { cn } from '@/shared/lib/class-names'
import type { IconComponent } from '@/shared/ui/icon-component'
import { Tooltip } from '@/shared/ui/tooltip'

type RailLinkProps = {
  to: '/' | '/projects/new'
  label: string
  icon: IconComponent
  /** Solar's filled variant, shown while the link is the current page. */
  currentIcon: IconComponent
  isCurrent: boolean
  onNavigate?: () => void
}

/** An icon-only page link on the rail, named by its tooltip and its accessible label. */
export function RailLink(props: RailLinkProps): JSX.Element {
  return (
    <Tooltip label={props.label}>
      <Link
        to={props.to}
        aria-label={props.label}
        aria-current={ariaCurrent(props.isCurrent)}
        onClick={props.onNavigate}
        className={cn(
          'text-muted-foreground hover:bg-foreground/8 hover:text-foreground flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors',
          props.isCurrent && 'bg-foreground/10 text-foreground',
        )}
      >
        <RailIcon {...props} />
      </Link>
    </Tooltip>
  )
}

function RailIcon({ icon: Icon, currentIcon: CurrentIcon, isCurrent }: RailLinkProps): JSX.Element {
  if (isCurrent) {
    return <CurrentIcon className="size-5.5" />
  }

  return <Icon className="size-5.5" />
}

function ariaCurrent(isCurrent: boolean): 'page' | undefined {
  if (isCurrent) {
    return 'page'
  }

  return undefined
}
