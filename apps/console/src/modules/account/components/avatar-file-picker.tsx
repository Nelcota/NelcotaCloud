import { FileInput } from '@/shared/ui/file-input'
import type { JSX } from 'react'
import { useState } from 'react'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
/** The photo is cropped and shrunk in the browser, so large camera photos are fine. */
const MAX_SOURCE_BYTES = 20 * 1024 * 1024

type FieldStatus = { type: 'error'; message: string }

/** Where the user drops or chooses the image to crop. */
export function AvatarFilePicker({ onPick }: { onPick: (file: File) => void }): JSX.Element {
  const [problem, setProblem] = useState<string | null>(null)

  function pick(file: File | null): void {
    if (file === null) {
      return
    }

    const found = problemWith(file)
    setProblem(found)

    if (found === null) {
      onPick(file)
    }
  }

  return (
    <FileInput
      label="Imagem"
      isLabelHidden
      mode="dropzone"
      placeholder="Escolha uma imagem ou arraste um arquivo até aqui"
      description="PNG, JPEG ou WebP, até 20 MB"
      accept={ACCEPTED_TYPES.join(',')}
      value={null}
      onChange={pick}
      status={statusOf(problem)}
    />
  )
}

function statusOf(problem: string | null): FieldStatus | undefined {
  if (problem === null) {
    return undefined
  }

  return { type: 'error', message: problem }
}

function problemWith(file: File): string | null {
  if (ACCEPTED_TYPES.includes(file.type) === false) {
    return 'Escolha uma imagem PNG, JPEG ou WebP.'
  }

  if (file.size > MAX_SOURCE_BYTES) {
    return 'A imagem passa de 20 MB. Escolha uma menor.'
  }

  return null
}
