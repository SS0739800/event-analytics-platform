// One source of truth for every colour that encodes data — charts and category
// badges both read from here, so a category looks the same everywhere.
//
// The eight hues are a validated categorical palette: fixed order, checked for
// lightness band, chroma floor, and protan/deuteran separation against a white
// surface. Don't reorder or extend it by eye — the order IS the colourblind
// safety mechanism.

// A warm palette, deliberately narrow in hue so the charts sit with the orange
// UI rather than fighting it.
//
// Because every slot is warm, hue can't do the separating — under red-green
// colourblindness these all shift toward the same yellows. Lightness does the
// work instead, which is why the steps jump around (deep rust, light amber,
// mid orange, amber, dark brown) rather than running in a neat ramp.
//
// Measured against a white surface: worst adjacent CVD ΔE 17.8, worst
// normal-vision ΔE 19.8 — comfortably above the 8 and 15 floors, and better
// separated than the multi-hue default this replaced.
//
// Two checks miss narrowly and knowingly: #f2a33c sits at lightness 0.776
// against a 0.77 ceiling, and #7a4a14 at chroma 0.093 against a 0.10 floor, so
// it reads a touch muted. Both are cosmetic, neither affects legibility.
//
// Several slots fall below 3:1 against white, which is allowed only because
// colour is never the sole cue here — every badge, pie slice and line carries
// a text label. Don't remove those labels.
// Six is the hard ceiling for this hue range — a seventh warm colour collapses
// to ΔE 2.0 against one of these, which is indistinguishable, not merely close.
export const SERIES = [
  '#a8380f', // deep rust
  '#f2a33c', // light amber
  '#c9541f', // orange
  '#eda100', // amber
  '#7a4a14', // dark brown
  '#e8845e', // salmon
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
