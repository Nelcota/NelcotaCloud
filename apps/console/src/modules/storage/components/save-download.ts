/** Long enough for the browser to start reading the blob before its URL is released. */
const REVOKE_DELAY_MS = 1_000

/** Hands a downloaded blob to the browser as a file named after the stored object. */
export function saveDownload(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)
}
