/** Hands a file the page built or fetched to the browser's download, under `fileName`. */
export function saveFile(file: Blob, fileName: string): void {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // The download has its own copy once started; the page no longer needs the URL.
  URL.revokeObjectURL(url)
}
