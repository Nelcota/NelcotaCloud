/**
 * Reads a small image into a `data:` URL. Unlike an object URL it needs no release, so it can sit
 * in the query cache and be shown by any number of components.
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.addEventListener('load', () => {
      const result = reader.result

      if (typeof result !== 'string') {
        reject(new Error('Não foi possível ler a imagem.'))
        return
      }

      resolve(result)
    })
    reader.addEventListener('error', () => reject(new Error('Não foi possível ler a imagem.')))
    reader.readAsDataURL(blob)
  })
}
