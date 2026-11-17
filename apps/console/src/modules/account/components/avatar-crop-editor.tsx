import Cropper, { type Area } from 'react-easy-crop'
import MagnifierZoomIn from '~icons/solar/magnifer-zoom-in-linear'
import MagnifierZoomOut from '~icons/solar/magnifer-zoom-out-linear'
import Restart from '~icons/solar/restart-linear'
import type { JSX } from 'react'
import { useId, useState } from 'react'

import { AvatarCropPreview } from '@/modules/account/components/avatar-crop-preview'
import type { PixelArea } from '@/shared/lib/crop-image'
import { Button } from '@/shared/ui/button'

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.01
const SQUARE = 1
const CENTER = { x: 0, y: 0 }

type AvatarCropEditorProps = {
  imageUrl: string
  onAreaChange: (area: PixelArea) => void
}

/** Drag to place the photo inside the circle; zoom with the slider, the wheel or a pinch. */
export function AvatarCropEditor({ imageUrl, onAreaChange }: AvatarCropEditorProps): JSX.Element {
  const [crop, setCrop] = useState(CENTER)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [previewArea, setPreviewArea] = useState<Area | null>(null)
  const zoomId = useId()

  function reset(): void {
    setCrop(CENTER)
    setZoom(MIN_ZOOM)
  }

  return (
    <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
      <div className="grid gap-4">
        <div className="bg-muted relative h-80 cursor-move overflow-hidden rounded-xl sm:h-96">
          <Cropper
            image={imageUrl}
            crop={crop}
            zoom={zoom}
            minZoom={MIN_ZOOM}
            maxZoom={MAX_ZOOM}
            aspect={SQUARE}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropAreaChange={(percentArea) => setPreviewArea(percentArea)}
            onCropComplete={(_, pixels) => onAreaChange(pixels)}
          />
        </div>
        <div className="flex items-center gap-3">
          <label htmlFor={zoomId} className="sr-only">
            Zoom
          </label>
          <MagnifierZoomOut aria-hidden="true" className="text-muted-foreground size-5 shrink-0" />
          <input
            id={zoomId}
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            value={zoom}
            onChange={(event) => setZoom(event.currentTarget.valueAsNumber)}
            className="accent-foreground h-2 w-full cursor-pointer"
          />
          <MagnifierZoomIn aria-hidden="true" className="text-muted-foreground size-5 shrink-0" />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Redefinir enquadramento"
            onClick={reset}
          >
            <Restart />
          </Button>
        </div>
      </div>
      <AvatarCropPreview imageUrl={imageUrl} area={previewArea} />
    </div>
  )
}
