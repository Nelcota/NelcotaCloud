import type { CSSProperties, JSX } from 'react'
import type { Area } from 'react-easy-crop'

/** The sizes the console shows the photo at: the account page and the account menu. */
const PREVIEW_SIZES = ['size-20', 'size-9']
const FULL = 100

type AvatarCropPreviewProps = {
  imageUrl: string
  /** The chosen square, in percent of the image (as the cropper reports it). */
  area: Area | null
}

/** How the photo will look once saved, updated while the user drags and zooms. */
export function AvatarCropPreview({ imageUrl, area }: AvatarCropPreviewProps): JSX.Element {
  return (
    <div aria-hidden="true" className="flex items-end gap-3 sm:flex-col sm:items-center">
      {PREVIEW_SIZES.map((size) => (
        <div
          key={size}
          className={`bg-muted relative shrink-0 overflow-hidden rounded-full ${size}`}
        >
          <PreviewImage imageUrl={imageUrl} area={area} />
        </div>
      ))}
    </div>
  )
}

function PreviewImage({ imageUrl, area }: AvatarCropPreviewProps): JSX.Element | null {
  if (area === null || area.width <= 0 || area.height <= 0) {
    return null
  }

  return <img src={imageUrl} alt="" className="absolute max-w-none" style={placement(area)} />
}

/** Scales the image so the chosen square fills the circle, and shifts it into place. */
function placement(area: Area): CSSProperties {
  return {
    width: `${(FULL / area.width) * FULL}%`,
    height: `${(FULL / area.height) * FULL}%`,
    left: `${(-area.x / area.width) * FULL}%`,
    top: `${(-area.y / area.height) * FULL}%`,
  }
}
