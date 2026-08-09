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
  const { color, variant } = categoryStyle(category, allCategories)
  return {
    bg: '#f4f4f4',
    text: '#0a0a0a',
    dot: color,
    // Tier-2 categories get a hollow ring so they read differently from the
    // tier-1 category sharing their hue.
    dotStyle: variant === 'outline'
      ? { background: 'transparent', boxShadow: `inset 0 0 0 2px ${color}` }
      : { background: color },
    badge: 'neutral',
  }
}

/**
 * Stable slot number for a category. Built-ins keep fixed slots so their colour
 * never moves when custom categories are added around them.
 */
function slotFor(category, allCategories) {
  const fixed = DEFAULT_INDEX[category]
  if (fixed !== undefined) return fixed
  const custom = (allCategories || []).filter(c => DEFAULT_INDEX[c] === undefined)
  const i = custom.indexOf(category)
  return i === -1 ? -1 : DEFAULT_CATEGORIES.length + i
}

/**
 * Colour and fill treatment for a category.
 *
 * Only six warm colours are distinguishable in this hue range, so categories
 * past the sixth reuse a hue and change *how* it's drawn instead — outlined
 * rather than filled. Two channels beat inventing a seventh colour that looks
 * like one already in use.
 */
export function categoryStyle(category, allCategories = DEFAULT_CATEGORIES) {
  const slot = slotFor(category, allCategories)
  if (slot === -1) return { color: OVERFLOW, variant: 'solid', tier: 0 }

  const tier = Math.floor(slot / SERIES.length)
  const color = SERIES[slot % SERIES.length]
  // Past two full passes there's nothing honest left to say — fall back to grey
  // rather than a third treatment nobody would decode.
  if (tier > 1) return { color: OVERFLOW, variant: 'solid', tier: 0 }
  return { color, variant: tier === 0 ? 'solid' : 'outline', tier }
}

/** Convenience for the many places that only need the hue. */
export function categoryColor(category, allCategories = DEFAULT_CATEGORIES) {
  return categoryStyle(category, allCategories).color
}
