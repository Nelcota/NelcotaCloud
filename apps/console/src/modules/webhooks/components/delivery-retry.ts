export type DeliveryRetry = {
  /** The delivery whose resend is in flight, if any. */
  retryingId: string | null
  onRetry: (deliveryId: string) => void
}
