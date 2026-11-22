import type { JSX } from 'react'

import { hostOf, pathOf } from '@/modules/webhooks/components/endpoint-host'
import { cn } from '@/shared/lib/utils'

type EndpointAddressProps = { url: string; className?: string }

/** The URL without its scheme: the host, which names the receiver, brighter than the path. */
export function EndpointAddress({ url, className }: EndpointAddressProps): JSX.Element {
  return (
    <span className={cn('font-mono', className)}>
      <span className="text-foreground">{hostOf(url)}</span>
      <span className="text-muted-foreground">{pathOf(url)}</span>
    </span>
  )
}
