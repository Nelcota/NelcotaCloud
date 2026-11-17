import Camera from '~icons/solar/camera-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { AvatarCropEditor } from '@/modules/account/components/avatar-crop-editor'
import { AvatarFilePicker } from '@/modules/account/components/avatar-file-picker'
import { useUploadAvatarMutation } from '@/modules/account/queries/use-avatar'
import type { PixelArea } from '@/shared/lib/crop-image'
import { usePickedImage } from '@/shared/lib/use-picked-image'
import { Button } from '@/shared/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { ErrorAlert } from '@/shared/ui/error-alert'

/** Opens the modal to choose an image, frame it in the circle and save it as the photo. */
export function AvatarUploadDialog({ triggerLabel }: { triggerLabel: string }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const { picked, pick } = usePickedImage()
  const [area, setArea] = useState<PixelArea | null>(null)
  const upload = useUploadAvatarMutation()

  /** Cleared after the closing animation, so the dialog does not flash back to the picker. */
  function resetWhenClosed(open: boolean): void {
    if (open) {
      return
    }

    pick(null)
    setArea(null)
    upload.reset()
  }

  function chooseAnother(): void {
    pick(null)
    setArea(null)
  }

  function save(): void {
    if (picked === null || area === null) {
      return
    }

    upload.mutate({ file: picked.file, area }, { onSuccess: () => setIsOpen(false) })
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen} onOpenChangeComplete={resetWhenClosed}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>
        <Camera />
        {triggerLabel}
      </DialogTrigger>
      <DialogContent className="gap-6 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Foto de perfil</DialogTitle>
          <DialogDescription>Arraste a foto para enquadrá-la no círculo.</DialogDescription>
        </DialogHeader>
        <DialogBody imageUrl={picked?.url ?? null} onPick={pick} onAreaChange={setArea} />
        <ErrorAlert error={upload.error} />
        <DialogFooter>
          <ChooseAnotherButton isVisible={picked !== null} onClick={() => chooseAnother()} />
          <DialogClose render={<Button variant="outline" />}>Cancelar</DialogClose>
          <Button
            onClick={save}
            disabled={area === null || upload.isPending}
            aria-busy={upload.isPending}
            className="aria-busy:cursor-progress"
          >
            <SaveLabel isSaving={upload.isPending} />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

type DialogBodyProps = {
  imageUrl: string | null
  onPick: (file: File) => void
  onAreaChange: (area: PixelArea) => void
}

function DialogBody({ imageUrl, onPick, onAreaChange }: DialogBodyProps): JSX.Element {
  if (imageUrl === null) {
    return <AvatarFilePicker onPick={onPick} />
  }

  return <AvatarCropEditor imageUrl={imageUrl} onAreaChange={onAreaChange} />
}

type ChooseAnotherButtonProps = { isVisible: boolean; onClick: () => void }

function ChooseAnotherButton({ isVisible, onClick }: ChooseAnotherButtonProps): JSX.Element | null {
  if (isVisible === false) {
    return null
  }

  return (
    <Button variant="ghost" onClick={onClick} className="sm:mr-auto">
      Trocar imagem
    </Button>
  )
}

function SaveLabel({ isSaving }: { isSaving: boolean }): JSX.Element {
  if (isSaving) {
    return <>Salvando…</>
  }

  return <>Salvar foto</>
}
