// Utility functions for Newsdeck

/**
 * Generate URL-friendly slug from dashboard name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[åäà]/g, 'a')
    .replace(/[öô]/g, 'o') 
    .replace(/[éè]/g, 'e')
    .replace(/[ç]/g, 'c')
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
}

/**
 * Ensure slug is unique by appending number if needed
 */
export function ensureUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
  let slug = baseSlug
  let counter = 1
  
  while (existingSlugs.includes(slug)) {
    slug = `${baseSlug}-${counter}`
    counter++
  }
  
  return slug
}