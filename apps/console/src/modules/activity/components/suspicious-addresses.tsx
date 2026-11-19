import DangerTriangle from '~icons/solar/danger-triangle-linear'
import type { JSX } from 'react'

import { SUSPICION_RULE } from '@/modules/activity/model/suspicious-addresses'
import { BlockAddressButton } from '@/modules/project-settings/ip-blocks/components/block-address-button'
import type { components } from '@/shared/api/api-schema'
import { formatDateTime, formatRelative } from '@/shared/lib/format-date'
import { Button } from '@/shared/ui/button'

type FailingAddress = components['schemas']['FailingAddress']

type SuspiciousAddressesProps = {
  projectId: string
  addresses: FailingAddress[]
  onInspect: (address: string) => void
}

/** A warning that only exists when an IP is guessing logins; a quiet project shows nothing. */
export function SuspiciousAddresses({
  projectId,
  addresses,
  onInspect,
}: SuspiciousAddressesProps): JSX.Element | null {
  if (addresses.length === 0) {
    return null
  }

  return (
    <section
      aria-labelledby="suspicious-addresses-title"
      className="grid gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-5 py-4"
    >
      <div className="flex items-start gap-3">
        <DangerTriangle
          aria-hidden="true"
          className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-400"
        />
        <div className="grid gap-0.5">
          <h2 id="suspicious-addresses-title" className="text-base">
            {suspiciousTitle(addresses.length)}
          </h2>
          <p className="text-muted-foreground text-sm">{SUSPICION_RULE}</p>
        </div>
      </div>
      <ul className="divide-y divide-amber-500/20">
        {addresses.map((address) => (
          <AddressRow
            key={address.ip_address}
            address={address}
            actions={{ projectId, onInspect }}
          />
        ))}
      </ul>
    </section>
  )
}

type AddressRowProps = {
  address: FailingAddress
  actions: { projectId: string; onInspect: (address: string) => void }
}

function AddressRow({ address, actions }: AddressRowProps): JSX.Element {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 pl-8">
      <span className="font-semibold tabular-nums">{address.ip_address}</span>
      <span className="text-muted-foreground text-sm tabular-nums">
        {plural(address.failures, 'recusa', 'recusas')} em{' '}
        {plural(address.accounts, 'conta', 'contas')} ·{' '}
        <time dateTime={address.last_seen_at} title={formatDateTime(address.last_seen_at)}>
          {formatRelative(address.last_seen_at)}
        </time>
      </span>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          aria-label={`Ver tentativas do IP ${address.ip_address}`}
          onClick={() => actions.onInspect(address.ip_address)}
        >
          Ver tentativas
        </Button>
        <BlockAddressButton projectId={actions.projectId} address={address.ip_address} size="sm" />
      </div>
    </li>
  )
}

function suspiciousTitle(count: number): string {
  if (count === 1) {
    return '1 IP suspeito'
  }

  return `${count} IPs suspeitos`
}

function plural(count: number, one: string, many: string): string {
  if (count === 1) {
    return `1 ${one}`
  }

  return `${count} ${many}`
}
