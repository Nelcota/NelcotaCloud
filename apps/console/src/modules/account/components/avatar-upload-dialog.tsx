import type { UseMutationResult } from '@tanstack/react-query'
import { Camera } from 'lucide-react'
import type { JSX } from 'react'
import { useState } from 'react'

import { AvatarCropEditor, type CropShape } from '@/modules/account/components/avatar-crop-editor'
import { AvatarFilePicker } from '@/modules/account/components/avatar-file-picker'
import type { ImageSelection, PixelArea } from '@/shared/lib/crop-image'
import { usePickedImage } from '@/shared/lib/use-picked-image'
import { ErrorAlert } from '@/shared/ui/error-alert'
import { PendingButton } from '@/shared/ui/pending-button'
import { Button } from '@/shared/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog'

export type ImageUploadCopy = {
  triggerLabel: string
  title: string
  description: string
  saveLabel: string
}

type AvatarUploadDialogProps = {
  copy: ImageUploadCopy
  cropShape: CropShape
  upload: UseMutationResult<unknown, Error, ImageSelection>
}

/** Opens the modal to choose an image, frame it and save it (a photo or a project's logo). */
export function AvatarUploadDialog({
  copy,
  cropShape,
  upload,
}: AvatarUploadDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const { picked, pick } = usePickedImage()
  const [area, setArea] = useState<PixelArea | null>(null)

  /** Cleared on opening rather than closing, so the closing dialog does not flash the picker. */
  function open(): void {
    chooseAnother()
    upload.reset()
    setIsOpen(true)
  }

  function chooseAnother(): void {
    pick(null)
    setArea(null)
  }

  /** Esc or the close button wait while the upload runs: closing would lose its result. */
  function changeOpen(next: boolean): void {
    if (upload.isPending) {
      return
    }

    setIsOpen(next)
  }

  function save(): void {
    if (picked === null || area === null) {
      return
    }

    upload.mutate({ file: picked.file, area }, { onSuccess: () => setIsOpen(false) })
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={open}>
        <Camera aria-hidden data-icon="inline-start" />
        {copy.triggerLabel}
      </Button>
      <Dialog open={isOpen} onOpenChange={changeOpen}>
        <DialogContent
          className="gap-4 sm:max-w-lg"
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="pe-8">
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.description}</DialogDescription>
          </DialogHeader>
          <DialogBody
            imageUrl={picked?.url ?? null}
            cropShape={cropShape}
            onPick={pick}
            onAreaChange={setArea}
          />
          <ErrorAlert error={upload.error} />
          <DialogFooter>
            <ChooseAnotherButton isVisible={picked !== null} onClick={chooseAnother} />
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <PendingButton
              type="button"
              isPending={upload.isPending}
              disabled={area === null}
              onClick={save}
            >
              {copy.saveLabel}
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

type DialogBodyProps = {
  imageUrl: string | null
  cropShape: CropShape
  onPick: (file: File) => void
  onAreaChange: (area: PixelArea) => void
}

function DialogBody({ imageUrl, cropShape, onPick, onAreaChange }: DialogBodyProps): JSX.Element {
  if (imageUrl === null) {
    return <AvatarFilePicker onPick={onPick} />
  }

  return <AvatarCropEditor imageUrl={imageUrl} cropShape={cropShape} onAreaChange={onAreaChange} />
}

type ChooseAnotherButtonProps = { isVisible: boolean; onClick: () => void }

function ChooseAnotherButton({ isVisible, onClick }: ChooseAnotherButtonProps): JSX.Element | null {
  if (isVisible === false) {
    return null
  }

  return (
    <Button type="button" variant="ghost" className="sm:me-auto" onClick={onClick}>
      Trocar imagem
    </Button>
  )
}
