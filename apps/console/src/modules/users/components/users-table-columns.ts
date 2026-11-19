import { cn } from '@/shared/lib/class-names'

/**
 * Login, last login, status and creation get their own columns from this table width; below it
 * the status and last login fold under the email, so nothing that matters is hidden.
 */
export const WIDE_COLUMN = 'hidden @3xl:table-cell'
export const NARROW_ONLY = '@3xl:hidden'

/**
 * Fixed widths for the short columns, so the user column takes the rest and the eye finds each
 * column at the same place on every page. Set on header and body cells alike. On a wide table
 * they grow in proportion, so the spare room spreads between all columns instead of opening a
 * gap after the email.
 */
export const WIDTHS = {
  select: 'w-12',
  login: 'w-24 @5xl:w-[10%]',
  lastSignIn: 'w-36 @5xl:w-[15%]',
  status: 'w-48 @5xl:w-[19%]',
  created: 'w-32 @5xl:w-[13%]',
  actions: 'w-14',
} as const

/** One side padding for every cell: 16px, the table's gutter. */
export const CELL_X = 'px-4'

/** The checkbox sits above the row's stretched link, like the menu, so both stay clickable. */
export const SELECT_CELL = cn(WIDTHS.select, 'relative z-10 pr-0 pl-4')

/** Headings at the rows' size and padding, so each sits exactly over its column. */
export const HEAD_CLASS = cn(CELL_X, 'h-11 text-xs')
