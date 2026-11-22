export type KeyRevocation = {
  isPending: boolean
  /** The key being revoked, while a revocation runs. */
  keyId: string | undefined
  onRevoke: (keyId: string) => Promise<void>
}
