/**
 * Narrow panels keep the address, the state and the recent deliveries; the events and the last
 * delivery's time appear as the panel (not the window) widens.
 */
export const ENDPOINT_COLUMN_VISIBILITY = {
  events: 'hidden @min-[56rem]:table-cell',
  strip: 'hidden @min-[36rem]:table-cell',
  lastAt: 'hidden @min-[46rem]:table-cell',
} as const
