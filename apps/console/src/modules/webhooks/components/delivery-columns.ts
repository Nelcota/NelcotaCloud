/** Narrow panels keep the state, the event and when; the rest appears as the panel widens. */
export const DELIVERY_COLUMN_VISIBILITY = {
  response: 'hidden @min-[34rem]:table-cell',
  duration: 'hidden @min-[40rem]:table-cell',
  attempts: 'hidden @min-[48rem]:table-cell',
  next: 'hidden @min-[58rem]:table-cell',
} as const
