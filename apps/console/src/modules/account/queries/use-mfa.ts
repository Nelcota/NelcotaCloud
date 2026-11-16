import type { MfaStatus, TotpEnrollment } from '@nelcota/sdk'
import {
  type UseMutationResult,
  type UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { disableTotp } from '@/modules/account/api/disable-totp'
import { enrollTotp } from '@/modules/account/api/enroll-totp'
import { readMfaStatus } from '@/modules/account/api/read-mfa-status'
import { verifyTotp } from '@/modules/account/api/verify-totp'

const MFA_QUERY_KEY = ['account', 'mfa'] as const

export function useMfaStatusQuery(): UseQueryResult<MfaStatus> {
  return useQuery({ queryKey: MFA_QUERY_KEY, queryFn: readMfaStatus })
}

export function useEnrollTotpMutation(): UseMutationResult<TotpEnrollment, Error, void> {
  return useMutation({ mutationFn: () => enrollTotp() })
}

/** Verifying or disabling changes the status, so both reload it. */
export function useVerifyTotpMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: verifyTotp,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MFA_QUERY_KEY }),
  })
}

export function useDisableTotpMutation(): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: disableTotp,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MFA_QUERY_KEY }),
  })
}
