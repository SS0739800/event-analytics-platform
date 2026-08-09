// One source of truth for every colour that encodes data — charts and category
// badges both read from here, so a category looks the same everywhere.
//
// The eight hues are a validated categorical palette: fixed order, checked for
// lightness band, chroma floor, and protan/deuteran separation against a white
// surface. Don't reorder or extend it by eye — the order IS the colourblind
// safety mechanism.

export const SERIES = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
]

// Anything past the eighth category shares this. Cycling the palette instead
// would give two categories the same colour with no way to tell them apart.
export const OVERFLOW = '#8a8a8a'

// Chrome for charts. Grid and axes recede; the data is the only thing with hue.
export const CHART = {
  grid: '#f0f0f0',
  axis: '#8a8a8a',
  ink: '#0a0a0a',
  // Single-series bars don't need a hue — the axis labels already say which bar
  // is which, so spending a colour there would be decoration.
  bar: '#0a0a0a',
  barHover: '#454545',
}

export const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e4e4e4',
  borderRadius: 4,
  fontSize: 12,
  boxShadow: '0 8px 32px rgba(10,10,10,.10)',
  fontFamily: 'Inter, system-ui, sans-serif',
}

export const tooltipCursor = { fill: 'rgba(10,10,10,.04)' }

/**
 * Colour for a category, keyed to its name rather than its position.
 *
 * Position-based lookup is a trap: filter one category out of a chart and every
 * remaining series would repaint, so the reader can't carry colour meaning from
 * one view to the next.
 */
export function seriesColor(category, allCategories = []) {
  const i = allCategories.indexOf(category)
  if (i === -1 || i >= SERIES.length) return OVERFLOW
  return SERIES[i]
}
