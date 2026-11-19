import type { JSX } from 'react'

import { AttentionRow } from '@/modules/overview/components/attention-row'
import { useAttentionItems } from '@/modules/overview/queries/use-attention-items'
import type { QueueHealth } from '@/modules/webhooks/model/webhook-queue-health'

type AttentionPanelProps = { projectId: string; webhookHealth: QueueHealth | undefined }

/** Only shown when something needs a change; a healthy project gets no reassurance banner. */
export function AttentionPanel({
  projectId,
  webhookHealth,
}: AttentionPanelProps): JSX.Element | null {
  const items = useAttentionItems(projectId, webhookHealth)

  if (items.length === 0) {
    return null
  }

  return (
    <section aria-labelledby="attention-title" className="surface">
      <h2 id="attention-title" className="px-5 pt-4 pb-1 text-base">
        Requer atenção
      </h2>
      <ul className="grid gap-0.5 px-2 pb-2">
        {items.map((item) => (
          <li key={item.id}>
            <AttentionRow item={item} />
          </li>
        ))}
      </ul>
    </section>
  )
}
