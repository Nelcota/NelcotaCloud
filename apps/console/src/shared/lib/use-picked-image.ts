import { useEffect, useRef, useState } from 'react'

/** A local image and a temporary URL to show it. */
export type PickedImage = { file: File; url: string }

export type PickedImageState = {
  picked: PickedImage | null
  /** Replaces the image (or clears it with `null`), releasing the previous URL. */
  pick: (file: File | null) => void
}

/**
 * The URL is made when the file is picked, not in an effect, so it lives exactly as long; the
 * last one is released when the component unmounts.
 */
export function usePickedImage(): PickedImageState {
  const [picked, setPicked] = useState<PickedImage | null>(null)
  const current = useRef<PickedImage | null>(null)

  useEffect(
    () => () => {
      release(current.current)
    },
    [],
  )

  function pick(file: File | null): void {
    release(current.current)
    const next = pickedFrom(file)
    current.current = next
    setPicked(next)
  }

  return { picked, pick }
}

function release(image: PickedImage | null): void {
  if (image === null) {
    return
  }

  URL.revokeObjectURL(image.url)
}

function pickedFrom(file: File | null): PickedImage | null {
  if (file === null) {
    return null
  }

  return { file, url: URL.createObjectURL(file) }
}
