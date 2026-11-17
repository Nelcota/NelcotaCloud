import { useState } from 'react'

/** A local image and a temporary URL to show it. */
export type PickedImage = { file: File; url: string }

export type PickedImageState = {
  picked: PickedImage | null
  /** Replaces the image (or clears it with `null`), releasing the previous URL. */
  pick: (file: File | null) => void
}

/** The URL is made when the file is picked, not in an effect, so it lives exactly as long. */
export function usePickedImage(): PickedImageState {
  const [picked, setPicked] = useState<PickedImage | null>(null)

  function pick(file: File | null): void {
    if (picked !== null) {
      URL.revokeObjectURL(picked.url)
    }

    setPicked(pickedFrom(file))
  }

  return { picked, pick }
}

function pickedFrom(file: File | null): PickedImage | null {
  if (file === null) {
    return null
  }

  return { file, url: URL.createObjectURL(file) }
}
