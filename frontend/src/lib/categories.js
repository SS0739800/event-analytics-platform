import { apiFetch } from './api'

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

// Colour palette — first 5 match the legacy hardcoded colours exactly
const PALETTE = [
  { bg: '#f0fdf4', text: '#059669', badge: 'green' },   // Academics
  { bg: '#eff6ff', text: '#2563eb', badge: 'blue' },    // Gym
  { bg: '#fffbeb', text: '#d97706', badge: 'orange' },  // Sports
  { bg: '#fef2f2', text: '#dc2626', badge: 'red' },     // Cooking
  { bg: '#f5f3ff', text: '#7c3aed', badge: 'purple' },  // Recreation
  { bg: '#f0fdfa', text: '#0d9488', badge: 'teal' },
  { bg: '#fdf4ff', text: '#a21caf', badge: 'pink' },
  { bg: '#eef2ff', text: '#4338ca', badge: 'indigo' },
  { bg: '#fefce8', text: '#b45309', badge: 'amber' },
  { bg: '#fff1f2', text: '#be123c', badge: 'rose' },
]

// Maps default category names to their fixed palette index
const DEFAULT_INDEX = { Academics: 0, Gym: 1, Sports: 2, Cooking: 3, Recreation: 4 }

export function getCategoryStyle(category, allCategories = DEFAULT_CATEGORIES) {
  if (DEFAULT_INDEX[category] !== undefined) return PALETTE[DEFAULT_INDEX[category]]
  const custom = allCategories.filter(c => DEFAULT_INDEX[c] === undefined)
  const i = custom.indexOf(category)
  return PALETTE[5 + (i >= 0 ? i % 5 : 0)]
}
