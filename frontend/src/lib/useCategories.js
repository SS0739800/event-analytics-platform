import { useState, useEffect } from 'react'
import { fetchCategories, DEFAULT_CATEGORIES } from './categories'

export function useCategories() {
  const [cats, setCats] = useState(DEFAULT_CATEGORIES)
  useEffect(() => { fetchCategories().then(setCats) }, [])
  return cats
}
