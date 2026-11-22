/** "203.0.113.7/32" reads as the address itself; real ranges keep their prefix. */
export function hostOf(network: string): string {
  return network.replace(/\/(32|128)$/, '')
}
