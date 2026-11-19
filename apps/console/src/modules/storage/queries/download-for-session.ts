import type { AuthClient } from '@nelcota/sdk'

type DownloadSession = Pick<AuthClient, 'getSession' | 'onAuthStateChange'>
type Download = {
  request: (signal: AbortSignal) => Promise<string>
  navigate: (url: string) => void
}

export async function downloadForSession(
  auth: DownloadSession,
  controller: AbortController,
  download: Download,
): Promise<void> {
  if (auth.getSession() === null || controller.signal.aborted) {
    return
  }

  const unsubscribe = auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'SIGNED_IN') {
      controller.abort()
    }
  })

  try {
    const url = await download.request(controller.signal)

    if (controller.signal.aborted === false && auth.getSession() !== null) {
      download.navigate(url)
    }
  } catch (error) {
    if (controller.signal.aborted === false) {
      throw error
    }
  } finally {
    unsubscribe()
  }
}
