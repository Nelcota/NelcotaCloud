import type { JSX } from 'react'

import { cn } from '@/shared/lib/utils'
import {
  Avatar as PrimitiveAvatar,
  AvatarFallback,
  AvatarImage,
} from '@/shared/ui/primitives/avatar'

const SIZES = {
  xs: 'size-6 text-2xs',
  sm: 'size-8 text-xs',
  md: 'size-9 text-sm',
  lg: 'size-11 text-base',
  xl: 'size-16 text-xl',
}

export type AvatarSize = keyof typeof SIZES

const SQUARE_RADII: Record<AvatarSize, string> = {
  xs: 'rounded-sm',
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
}

/** A person or project: their photo, or their initials on a tinted square. */
export function Avatar({
  name,
  src,
  size = 'md',
  isSquare,
}: {
  name: string
  src?: string
  size?: AvatarSize
  isSquare?: boolean
}): JSX.Element {
  return (
    <PrimitiveAvatar
      title={name}
      className={cn('isolate shrink-0', SIZES[size], isSquare === true && SQUARE_RADII[size])}
    >
      {src !== undefined && (
        <AvatarImage src={src} alt="" className="rounded-[inherit] object-cover" />
      )}
      <AvatarFallback className="rounded-[inherit] bg-surface-hover font-medium text-foreground">
        {initialsOf(name)}
      </AvatarFallback>
    </PrimitiveAvatar>
  )
}

function initialsOf(name: string): string {
  const initials = name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join('')
    .toLocaleUpperCase('pt-BR')

  if (initials === '') {
    return '?'
  }

  return initials
}
