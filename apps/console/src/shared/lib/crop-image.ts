/** A rectangle of the source image, in its own pixels. */
export type PixelArea = { x: number; y: number; width: number; height: number }

/** Large enough for sharp 2x avatars, small enough to stay far below the API's upload limit. */
const OUTPUT_SIZE = 512
const OUTPUT_TYPE = 'image/jpeg'
const OUTPUT_QUALITY = 0.9
const BACKGROUND = '#ffffff'

/** Draws the chosen part of an image into a square JPEG, ready to upload. */
export async function cropImage(source: Blob, area: PixelArea): Promise<Blob> {
  const bitmap = await createImageBitmap(source)
  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const context = canvas.getContext('2d')

  if (context === null) {
    bitmap.close()
    throw new Error('Seu navegador não conseguiu processar a imagem.')
  }

  // JPEG has no transparency: transparent parts would turn black.
  context.fillStyle = BACKGROUND
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  context.drawImage(bitmap, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  bitmap.close()

  return canvasToBlob(canvas)
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          reject(new Error('Não foi possível gerar a imagem recortada.'))
          return
        }

        resolve(blob)
      },
      OUTPUT_TYPE,
      OUTPUT_QUALITY,
    )
  })
}
