import Upload from '~icons/solar/upload-linear'
import type { JSX } from 'react'
import { useState } from 'react'

import type { StorageBucket } from '@/modules/storage/api/storage-types'
import { UploadFileForm } from '@/modules/storage/components/upload-file-form'
import { useUploadFile } from '@/modules/storage/queries/use-storage-object-mutations'
import { showFlash } from '@/shared/lib/flash-notice'
import { Button } from '@/shared/ui/primitives/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/primitives/dialog'

type UploadFileDialogProps = { projectId: string; bucket: StorageBucket }

/** The page's main action: sends one file to the bucket on screen. */
export function UploadFileDialog({ projectId, bucket }: UploadFileDialogProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(false)
  const upload = useUploadFile(projectId, bucket.id)

  // An upload in flight keeps the dialog, so its outcome is never lost.
  function changeOpen(open: boolean): void {
    if (upload.isPending) {
      return
    }

    upload.reset()
    setIsOpen(open)
  }

  function finish(fileName: string): void {
    setIsOpen(false)
    showFlash(`Arquivo enviado: ${fileName}`)
  }

  return (
    <Dialog open={isOpen} onOpenChange={changeOpen}>
      <Button type="button" onClick={() => changeOpen(true)}>
        <Upload aria-hidden data-icon="inline-start" />
        Enviar arquivo
      </Button>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(event) => event.preventDefault()}
      >
        <DialogHeader className="pe-8">
          <DialogTitle>Enviar arquivo</DialogTitle>
          <DialogDescription>
            Para o bucket <span className="font-mono text-foreground">{bucket.name}</span>.
          </DialogDescription>
        </DialogHeader>
        <UploadFileForm upload={upload} onUploaded={finish} onCancel={() => changeOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
