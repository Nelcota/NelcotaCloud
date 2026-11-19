import type { components } from '@/shared/api/api-schema'

type FailingAddress = components['schemas']['FailingAddress']

/** From this many refusals, one address is guessing, not someone mistyping a password. */
const MANY_FAILURES = 5
/** From this many accounts, one address is trying users one after another. */
const MANY_ACCOUNTS = 3

/** The rule in words, shown wherever the page calls an address suspicious. */
export const SUSPICION_RULE = `Um IP é suspeito com ${MANY_FAILURES} logins recusados ou mais, ou ao tentar ${MANY_ACCOUNTS} contas ou mais, no período.`

/** The refused addresses worth a look; one or two typos from a user's own device are not. */
export function suspiciousAddresses(addresses: readonly FailingAddress[]): FailingAddress[] {
  return addresses.filter(
    (address) => address.failures >= MANY_FAILURES || address.accounts >= MANY_ACCOUNTS,
  )
}
