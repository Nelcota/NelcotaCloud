/**
 * The large data tables (activity, API keys) share one look: a header row a step darker than
 * the card, headings at a readable size, and cells padded alike so headings sit over content.
 */

/** A faint dark tint, so the header row separates from the rows in both themes. */
export const TABLE_HEADER_TINT = 'bg-black/[0.03] dark:bg-black/10'

/** One side padding for every heading and cell; tighter while the table is narrow. */
export const CELL_X = 'px-3 @xl:px-5'

/** Under a heading led by its 20px icon and 12px gap, content starts where the heading's text does. */
export const CELL_UNDER_ICON = 'pr-3 pl-11 @xl:pr-5 @xl:pl-13'

/** Every cell starts at the row's top, so a row with one tall cell still reads on one line. */
export const CELL_Y = 'py-3 align-top'

/** Column headings at the table's reading size, not the compact default. */
export const HEAD_CELL = 'h-12 text-sm'
