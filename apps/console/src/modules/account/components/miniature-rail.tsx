import { LayoutGrid as Grid, Activity as Pulse, Settings, CircleUser as User } from 'lucide-react'
import type { JSX } from 'react'

import { LogoMark } from '@/shared/ui/logo-mark'

const ITEMS = [
  { id: 'projects', icon: Grid, isActive: true },
  { id: 'activity', icon: Pulse, isActive: false },
  { id: 'account', icon: User, isActive: false },
  { id: 'settings', icon: Settings, isActive: false },
]

/** The miniature's icon rail on the frame, the projects item active. */
export function MiniatureRail(): JSX.Element {
  return (
    <div className="flex w-9 shrink-0 flex-col items-center gap-1.5 pt-1.5">
      <span className="size-4 [&_img]:size-4">
        <LogoMark size={24} />
      </span>
      <span className="h-1" />
      {ITEMS.map((item) => (
        <RailItem key={item.id} icon={item.icon} isActive={item.isActive} />
      ))}
    </div>
  )
}

type RailItemProps = { icon: typeof Grid; isActive: boolean }

function RailItem({ icon: Glyph, isActive }: RailItemProps): JSX.Element {
  if (isActive) {
    return (
      <span className="grid size-6 place-items-center rounded-md bg-surface-hover text-foreground">
        <Glyph className="size-3" />
      </span>
    )
  }

  return (
    <span className="grid size-6 place-items-center text-muted-foreground">
      <Glyph className="size-3" />
    </span>
  )
}
