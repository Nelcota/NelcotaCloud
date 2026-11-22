import { useMfaStatusQuery } from '@/modules/account/queries/use-mfa'

/** Whether the console account still signs in without a second step. */
export function useIsMfaOff(): boolean {
  const status = useMfaStatusQuery()

  return status.data?.totp_enabled === false
}
