export function categoryRoute(categorySlug: string, subcategorySlug?: string) {
  const categoryPath = `/categories/${encodeURIComponent(categorySlug)}`;

  if (!subcategorySlug) {
    return categoryPath;
  }

  return `${categoryPath}/${encodeURIComponent(subcategorySlug)}`;
}
