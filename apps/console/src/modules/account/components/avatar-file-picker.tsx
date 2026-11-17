import GalleryAdd from '~icons/solar/gallery-add-linear'
import type { DragEvent, JSX } from 'react'
import { useState } from 'react'

import { cn } from '@/shared/lib/class-names'
import { ErrorAlert } from '@/shared/ui/error-alert'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
/** The photo is cropped and shrunk in the browser, so large camera photos are fine. */
const MAX_SOURCE_BYTES = 20 * 1024 * 1024

/** Where the user drops or chooses the image to crop. */
export function AvatarFilePicker({ onPick }: { onPick: (file: File) => void }): JSX.Element {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  function pick(file: File | null): void {
    if (file === null) {
      return
    }

    const problem = problemWith(file)
    setError(problem)

    if (problem === null) {
      onPick(file)
    }
  }

  function drop(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault()
    setIsDragging(false)
    pick(event.dataTransfer.files.item(0))
  }

  function dragOver(event: DragEvent<HTMLLabelElement>): void {
    event.preventDefault()
    setIsDragging(true)
  }

  return (
    <div className="grid gap-3">
      <label
        onDragOver={dragOver}
        onDragLeave={() => setIsDragging(false)}
        onDrop={drop}
        className={cn(
          'border-foreground/20 hover:bg-muted/50 has-focus-visible:border-ring has-focus-visible:ring-ring/50 grid min-h-72 cursor-pointer content-center justify-items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-[background-color,border-color,transform] active:scale-[0.99] has-focus-visible:ring-3 motion-reduce:transition-none motion-reduce:active:scale-100',
          isDragging && 'border-primary bg-muted/50',
        )}
      >
        <GalleryAdd aria-hidden="true" className="text-muted-foreground size-8" />
        <span className="grid gap-1">
          <span className="text-sm font-medium">
            <DropPrompt isDragging={isDragging} />
          </span>
          <span className="text-muted-foreground text-xs">PNG, JPEG ou WebP, até 20 MB</span>
        </span>
        <input
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          aria-label="Escolher imagem"
          className="sr-only"
          onChange={(event) => pick(event.currentTarget.files?.item(0) ?? null)}
        />
      </label>
      <ErrorAlert error={error} />
    </div>
  )
}

function DropPrompt({ isDragging }: { isDragging: boolean }): JSX.Element {
  if (isDragging) {
    return <>Solte a imagem</>
  }

  return (
    <>
      Arraste uma imagem ou{' '}
      <span className="text-primary-ink underline underline-offset-3">escolha um arquivo</span>
    </>
  )
}

function problemWith(file: File): Error | null {
  if (ACCEPTED_TYPES.includes(file.type) === false) {
    return new Error('Escolha uma imagem PNG, JPEG ou WebP.')
  }

  if (file.size > MAX_SOURCE_BYTES) {
    return new Error('A imagem passa de 20 MB. Escolha uma menor.')
  }

  return null
}
