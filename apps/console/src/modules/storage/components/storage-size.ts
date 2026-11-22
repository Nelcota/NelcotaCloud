const numberFormat = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

const KIBIBYTE = 1024
const MEBIBYTE = 1_048_576

/** "12 B", "3,4 KiB", "1,2 MiB": a file size in binary units with pt-BR digits. */
export function sizeLabel(bytes: number): string {
  if (bytes >= MEBIBYTE) {
    return `${numberFormat.format(bytes / MEBIBYTE)} MiB`
  }

  if (bytes >= KIBIBYTE) {
    return `${numberFormat.format(bytes / KIBIBYTE)} KiB`
  }

  return `${numberFormat.format(bytes)} B`
}
