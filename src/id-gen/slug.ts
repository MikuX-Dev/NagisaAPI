export function slug(str?: string | null) {
  if (!str) return ''

  return (
    str
      .normalize('NFKD')
      .toLowerCase()
      // Remove accents/diacritics
      .replace(/[\u0300-\u036f]/g, '')
      // Replace spaces and underscores with hyphens
      .replace(/[\s_]+/g, '-')
      // Replace any non-alphanumeric chars (except hyphens) with hyphens
      .replace(/[^a-z0-9-]/g, '-')
      // Replace multiple consecutive hyphens with single hyphen
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-+|-+$/g, '')
  )
}
