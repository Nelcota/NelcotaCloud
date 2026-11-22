import { hostOf } from '@/modules/activity/components/address-host'
import type { components } from '@/shared/api/api-schema'
import { formatCount } from '@/shared/lib/format-number'

type Schemas = components['schemas']
type FailingAddress = Schemas['FailingAddress']

/** Fewer refusals than this from one address read as typos, not as someone guessing. */
export const ALERT_FAILURES = 5

/** The failing addresses worth acting on: enough refusals and not blocked yet, most first. */
export function addressesNeedingAction(
  failing: FailingAddress[],
  blocks: Schemas['BlockedAddress'][],
): FailingAddress[] {
  const blocked = new Set(blocks.map((block) => hostOf(block.network)))

  return failing.filter(
    (address) => address.failures >= ALERT_FAILURES && blocked.has(address.ip_address) === false,
  )
}

/** "8 logins recusados", "1 login recusado". */
export function failuresText(failures: number): string {
  if (failures === 1) {
    return '1 login recusado'
  }

  return `${formatCount(failures)} logins recusados`
}

/** "Tentou 3 contas diferentes", "Tentou 1 conta". */
export function accountsText(accounts: number): string {
  if (accounts === 1) {
    return 'Tentou 1 conta'
  }

  return `Tentou ${formatCount(accounts)} contas diferentes`
}
