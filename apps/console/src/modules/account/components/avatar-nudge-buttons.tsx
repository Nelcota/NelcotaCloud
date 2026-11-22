import type { Point, Size } from 'react-easy-crop'
import ArrowDown from '~icons/solar/alt-arrow-down-linear'
import ArrowLeft from '~icons/solar/alt-arrow-left-linear'
import ArrowRight from '~icons/solar/alt-arrow-right-linear'
import ArrowUp from '~icons/solar/alt-arrow-up-linear'
import type { JSX } from 'react'

import { Button } from '@/shared/ui/primitives/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/primitives/tooltip'

const CENTER = { x: 0, y: 0 }
const MOVE_STEP = 16
const DIRECTIONS = [
  { label: 'Mover foto para cima', icon: ArrowUp, x: 0, y: -1 },
  { label: 'Mover foto para baixo', icon: ArrowDown, x: 0, y: 1 },
  { label: 'Mover foto para a esquerda', icon: ArrowLeft, x: -1, y: 0 },
  { label: 'Mover foto para a direita', icon: ArrowRight, x: 1, y: 0 },
]

/** What bounds the photo's movement: its size, the circle's size and the zoom. */
type CropSizes = { media: Size | null; crop: Size | null; zoom: number }

type AvatarNudgeButtonsProps = {
  crop: Point
  sizes: CropSizes
  onCropChange: (crop: Point) => void
}

/** Moves the photo one step at a time, for keyboards and for precise placement. */
export function AvatarNudgeButtons({
  crop,
  sizes,
  onCropChange,
}: AvatarNudgeButtonsProps): JSX.Element {
  const limits = cropLimits(sizes)

  return (
    <div className="flex gap-1" role="group" aria-label="Mover a foto">
      {DIRECTIONS.map((direction) => {
        const moved = nudge(crop, limits, direction)

        return (
          <Tooltip key={direction.label}>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={direction.label}
                disabled={isSamePoint(moved, crop)}
                onClick={() => onCropChange(moved)}
              >
                <direction.icon aria-hidden />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{direction.label}</TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

function cropLimits({ media, crop, zoom }: CropSizes): Point {
  if (media === null || crop === null) {
    return CENTER
  }

  return {
    x: Math.max(0, (media.width * zoom - crop.width) / 2),
    y: Math.max(0, (media.height * zoom - crop.height) / 2),
  }
}

function nudge(crop: Point, limits: Point, direction: Point): Point {
  return {
    x: Math.min(limits.x, Math.max(-limits.x, crop.x + direction.x * MOVE_STEP)),
    y: Math.min(limits.y, Math.max(-limits.y, crop.y + direction.y * MOVE_STEP)),
  }
}

function isSamePoint(first: Point, second: Point): boolean {
  return first.x === second.x && first.y === second.y
}
