import { useSchemaQuery } from '@/modules/database/queries/use-schema-query'
import {
  type AttentionItem,
  rlsAttention,
  smtpAttention,
  webhookAttention,
} from '@/modules/overview/model/attention-items'
import type { QueueHealth } from '@/modules/webhooks/model/webhook-queue-health'
import { useSmtpQuery } from '@/modules/project-settings/smtp/queries/use-smtp-settings'
import { useUserCountQuery } from '@/modules/users/queries/use-users'

/**
 * What needs fixing, from whatever has loaded. Failed loads add nothing here: the cards for the
 * same data show the error and the way to retry.
 */
export function useAttentionItems(
  projectId: string,
  webhookHealth: QueueHealth | undefined,
): AttentionItem[] {
  const schema = useSchemaQuery(projectId)
  const smtp = useSmtpQuery(projectId)
  const userCount = useUserCountQuery(projectId)
  const tables = schema.data?.tables ?? []
  const items = rlsAttention(projectId, tables)

  if (webhookHealth !== undefined) {
    items.push(...webhookAttention(projectId, webhookHealth))
  }

  if (smtp.data !== undefined && userCount.data !== undefined) {
    items.push(...smtpAttention(projectId, smtp.data, userCount.data))
  }

  return items
}
