import { useEffect, useRef, useState } from 'react'

export function useClipboard({ announce }: { announce: string }) {
  const [isCopied, setCopied] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timeout.current), [])

  async function copy(value: string): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      clearTimeout(timeout.current)
      setCopied(false)

      return false
    }

    clearTimeout(timeout.current)
    setCopied(true)
    timeout.current = setTimeout(() => setCopied(false), 1800)

    return true
  }

  return { copy, isCopied, announcement: isCopied ? announce : '' }
}
