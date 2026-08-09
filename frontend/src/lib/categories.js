import { apiFetch } from './api'
import { SERIES, OVERFLOW } from './chartTheme'

export const DEFAULT_CATEGORIES = ['Academics', 'Gym', 'Sports', 'Cooking', 'Recreation']

let _cache = null

export async function fetchCategories() {
  if (_cache) return _cache
  try {
    const r = await apiFetch('/api/categories')
    if (r.ok) { _cache = await r.json(); return _cache }
  } catch {}
  return DEFAULT_CATEGORIES
}

export function invalidateCategoriesCache() { _cache = null }

// Fixed slots for the built-in categories so their colour never moves, even
// when custom categories are added around them.
const DEFAULT_INDEX = { Academics: 0, Gym: 1, Sports: 2, Cooking: 3, Recreation: 4 }

/**
 * Badge/chip styling for a category.
 *
 * Chips are neutral with a coloured dot rather than tinted pills: the hue does
 * identity work, the text stays readable ink, and the label means colour is
 * never the only thing distinguishing two categories.
 *
 * `dot` matches what the charts use for the same category — both come from
 * SERIES in chartTheme.js.
 */
export function getCategoryStyle(category, allCategories = DEFAULT_CATEGORIES) {
  return {
    bg: '#f4f4f4',
    text: '#0a0a0a',
    dot: categoryColor(category, allCategories),
    badge: 'neutral',
  }
}

/** The data colour for a category — shared by charts and badges. */
export function categoryColor(category, allCategories = DEFAULT_CATEGORIES) {
  const fixed = DEFAULT_INDEX[category]
  if (fixed !== undefined) return SERIES[fixed]

  // Custom categories take the slots after the built-ins, in a stable order.
  // Past the eighth they share the overflow grey — cycling the palette would
  // hand two categories the same colour with nothing to separate them.
  const custom = (allCategories || []).filter(c => DEFAULT_INDEX[c] === undefined)
  const i = custom.indexOf(category)
  if (i === -1) return OVERFLOW
  const slot = DEFAULT_CATEGORIES.length + i
  return slot < SERIES.length ? SERIES[slot] : OVERFLOW
}
