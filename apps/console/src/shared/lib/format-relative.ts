const MINUTE = 60
const HOUR = 3_600
const DAY = 86_400
const MONTH = 30 * DAY
const YEAR = 365 * DAY
const UNKNOWN = '—'

const STEPS = [
  [YEAR, 'a'],
  [MONTH, 'mês'],
  [DAY, 'd'],
  [HOUR, 'h'],
  [MINUTE, 'min'],
] as const

/** Short relative time the way the panel writes it: "agora", "há 48min", "há 14h", "em 2d". */
export function formatRelative(isoDate: string, now: number = Date.now()): string {
  const time = Date.parse(isoDate)

  if (Number.isNaN(time)) {
    return UNKNOWN
  }

  const seconds = Math.round((now - time) / 1000)
  const distance = Math.abs(seconds)
  const step = STEPS.find(([size]) => distance >= size)

  if (step === undefined) {
    return 'agora'
  }

  const [size, unit] = step
  const amount = withUnit(Math.floor(distance / size), unit)

  if (seconds < 0) {
    return `em ${amount}`
  }

  return `há ${amount}`
}

/** Letter units stay glued to the number ("14h"); months are a word ("2 meses"). */
function withUnit(amount: number, unit: string): string {
  if (unit !== 'mês') {
    return `${amount}${unit}`
  }

  if (amount === 1) {
    return '1 mês'
  }

  return `${amount} meses`
}
