import ResendIcon from '~icons/logos/resend-icon'
import type { JSX, SVGProps } from 'react'

import { cn } from '@/shared/lib/utils'

/** Resend's mark is black, so it inverts on the dark theme to stay visible. */
export function ResendLogo({ className, ...props }: SVGProps<SVGSVGElement>): JSX.Element {
  return <ResendIcon {...props} className={cn(className, 'dark:invert')} />
}
