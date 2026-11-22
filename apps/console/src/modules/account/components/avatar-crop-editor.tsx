import Cropper, { type Size } from 'react-easy-crop'
import Restart from '~icons/solar/restart-linear'
import type { JSX } from 'react'
import { useId, useState } from 'react'

import { AvatarNudgeButtons } from '@/modules/account/components/avatar-nudge-buttons'
import type { PixelArea } from '@/shared/lib/crop-image'
import { Button } from '@/shared/ui/primitives/button'
import { Slider } from '@/shared/ui/primitives/slider'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip'

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const ZOOM_STEP = 0.01
const SQUARE = 1
const CENTER = { x: 0, y: 0 }
const PERCENT = 100

type AvatarCropEditorProps = {
  imageUrl: string
  onAreaChange: (area: PixelArea) => void
}

/** Drag to place the photo inside the circle; zoom with the slider, the wheel or a pinch. */
export function AvatarCropEditor({ imageUrl, onAreaChange }: AvatarCropEditorProps): JSX.Element {
  const zoomLabelId = useId()
  const [crop, setCrop] = useState(CENTER)
  const [zoom, setZoom] = useState(MIN_ZOOM)
  const [mediaSize, setMediaSize] = useState<Size | null>(null)
  const [cropSize, setCropSize] = useState<Size | null>(null)

  function reset(): void {
    setCrop(CENTER)
    setZoom(MIN_ZOOM)
  }

  return (
    <div className="flex flex-col gap-4">
      {/* The cropper positions itself absolutely, so its frame must be the positioned box. */}
      <div className="relative h-[22.5rem] cursor-move overflow-hidden rounded-lg border bg-frame">
        <Cropper
          image={imageUrl}
          crop={crop}
          zoom={zoom}
          minZoom={MIN_ZOOM}
          maxZoom={MAX_ZOOM}
          aspect={SQUARE}
          cropShape="round"
          showGrid={false}
          cropperProps={{ role: 'group', 'aria-label': 'Enquadramento da foto' }}
          mediaProps={{ alt: '' }}
          onMediaLoaded={setMediaSize}
          onCropSizeChange={setCropSize}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={(_, pixels) => onAreaChange(pixels)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-surface px-3 py-2">
        <AvatarNudgeButtons
          crop={crop}
          sizes={{ media: mediaSize, crop: cropSize, zoom }}
          onCropChange={setCrop}
        />
        <div className="flex min-w-40 flex-1 items-center gap-3">
          <span id={zoomLabelId} className="text-xs text-muted-foreground">
            Zoom
          </span>
          <Slider
            value={[zoom]}
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={ZOOM_STEP}
            thumbLabelledBy={zoomLabelId}
            formatValue={(value) => `${Math.round(value * PERCENT)}%`}
            onValueChange={(values) => setZoom(values.at(0) ?? MIN_ZOOM)}
          />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Redefinir enquadramento"
              onClick={reset}
            >
              <Restart aria-hidden />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Redefinir enquadramento</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
