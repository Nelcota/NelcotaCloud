import type { JSX } from 'react'

import { EndpointActions } from '@/modules/webhooks/components/endpoint-actions'
import { EndpointFacts } from '@/modules/webhooks/components/endpoint-facts'
import { hostOf } from '@/modules/webhooks/components/endpoint-host'
import type { EndpointPanel } from '@/modules/webhooks/components/endpoint-panel-types'
import { EndpointToggle } from '@/modules/webhooks/components/endpoint-toggle'
import { CopyButton } from '@/shared/ui/copy-button'

type EndpointDetailHeaderProps = { panel: EndpointPanel; titleId: string; onTest: () => void }

/** Host as the title, the full URL to copy, the facts devs look up, the switch and the menu. */
export function EndpointDetailHeader({
  panel,
  titleId,
  onTest,
}: EndpointDetailHeaderProps): JSX.Element {
  const { projectId, endpoint } = panel

  return (
    <div className="flex flex-col gap-3 border-b px-5 py-4 sm:px-6">
      <div className="flex items-start justify-between gap-3">
        <div className="grid min-w-0 flex-1 gap-0.5">
          <h2 id={titleId} className="min-w-0 text-xl font-semibold wrap-anywhere">
            {hostOf(endpoint.url)}
          </h2>
          <div className="flex min-w-0 items-center gap-0.5">
            <code className="min-w-0 font-mono text-sm text-muted-foreground wrap-anywhere">
              {endpoint.url}
            </code>
            <CopyButton value={endpoint.url} description="URL do endpoint" isIconOnly />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <EndpointToggle projectId={projectId} endpoint={endpoint} />
          <EndpointActions panel={panel} onTest={onTest} />
        </div>
      </div>
      <EndpointFacts endpoint={endpoint} />
    </div>
  )
}
