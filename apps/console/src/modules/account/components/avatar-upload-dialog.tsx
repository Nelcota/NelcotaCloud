import Camera from '~icons/solar/camera-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import { AvatarCropEditor } from '@/modules/account/components/avatar-crop-editor'
import { AvatarFilePicker } from '@/modules/account/components/avatar-file-picker'
import { useUploadAvatarMutation } from '@/modules/account/queries/use-avatar'
import type { PixelArea } from '@/shared/lib/crop-image'
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

/** Opens the modal to choose an image, frame it in the circle and save it as the photo. */
export function AvatarUploadDialog({ triggerLabel }: { triggerLabel: string }): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const { picked, pick } = usePickedImage()
  const [area, setArea] = useState<PixelArea | null>(null)
  const upload = useUploadAvatarMutation()

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

  function save(): void {
    if (picked === null || area === null) {
      return
    }

    upload.mutate({ file: picked.file, area }, { onSuccess: () => setIsOpen(false) })
  }

  return (
    <>
      <Button type="button" onClick={open}>
        <Camera aria-hidden data-icon="inline-start" />
        {triggerLabel}
      </Button>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="sm:max-w-xl"
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="pe-8">
            <DialogTitle>Foto de perfil</DialogTitle>
            <DialogDescription>
              Escolha uma imagem e ajuste o enquadramento arrastando ou usando os botões de posição.
            </DialogDescription>
          </DialogHeader>
          <DialogBody imageUrl={picked?.url ?? null} onPick={pick} onAreaChange={setArea} />
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
              Salvar foto
            </PendingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
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
    <Button type="button" variant="ghost" className="sm:me-auto" onClick={onClick}>
      Trocar imagem
    </Button>
  )
}
