/**
 * Which columns show from which width of the table itself (a container query). Below each
 * width, the column's content moves under the key's name, so nothing is ever hidden.
 */
export const KEY_COLUMNS = {
  value: 'hidden @xl:table-cell',
  dates: 'hidden @3xl:table-cell',
} as const

/**
 * Fixed widths, the same in every key table on the page, so the app's and the server's tables
 * line up column for column; the name takes what is left.
 */
export const KEY_WIDTHS = {
  value: '@xl:w-60',
  created: '@3xl:w-32',
  lastUse: '@3xl:w-36',
  actions: 'w-14',
} as const

/** The name column, padded like every other column so each heading sits over its content. */
export const NAME_CELL_X = 'px-3 @xl:px-5'

/** Below this width the header row would show a lone "Nome", so it is for screen readers only. */
export const KEY_HEADER = '@max-xl:sr-only'

/** The same widths, for the lines under the name that stand in for a hidden column. */
export const KEY_STAND_INS = {
  value: '@xl:hidden',
  dates: '@3xl:hidden',
} as const
