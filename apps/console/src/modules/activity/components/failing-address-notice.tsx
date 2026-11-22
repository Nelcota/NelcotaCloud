import type { JSX } from 'react'
import { useState } from 'react'

import { periodText } from '@/modules/activity/components/activity-filters'
import { accountsText, failuresText } from '@/modules/activity/components/addresses-needing-action'
import { BlockAddressDialog } from '@/modules/activity/components/block-address-dialog'
import type { components } from '@/shared/api/api-schema'
import { Notice } from '@/shared/ui/notice'
import { Button } from '@/shared/ui/primitives/button'

type FailingAddress = components['schemas']['FailingAddress']

type FailingAddressNoticeProps = {
  projectId: string
  alert: { address: FailingAddress; otherCount: number; days: number }
  onShowEvents: (address: string) => void
}

/** The one thing to act on: the address with the most refused logins, and blocking it. */
export function FailingAddressNotice({
  projectId,
  alert,
  onShowEvents,
}: FailingAddressNoticeProps): JSX.Element {
  const [blockTarget, setBlockTarget] = useState<string | null>(null)
  const address = alert.address
  const ip = address.ip_address

  return (
    <>
      <Notice
        tone="warning"
        className="flex-wrap"
        title={
          <>
            {failuresText(address.failures)} de{' '}
            <code className="font-mono wrap-anywhere">{ip}</code> {periodText(alert.days)}
          </>
        }
        action={
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setBlockTarget(ip)}
            >
              Bloquear
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => onShowEvents(ip)}>
              Ver eventos
            </Button>
          </div>
        }
      >
        {accountsText(address.accounts)}
        {otherAddressesText(alert.otherCount)}
      </Notice>
      <BlockAddressDialog
        projectId={projectId}
        address={blockTarget}
        onClose={() => setBlockTarget(null)}
      />
    </>
  )
}

/** The rest wait in "Endereços com mais recusas" at the bottom of the page. */
function otherAddressesText(count: number): string {
  if (count === 0) {
    return ''
  }

  if (count === 1) {
    return ' · mais 1 endereço na lista abaixo'
  }

  return ` · mais ${count} endereços na lista abaixo`
}
