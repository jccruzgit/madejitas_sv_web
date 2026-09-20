export function mapCatalogRow(row) {
  return {
    id: row.id,
    name: row.name,
    detail: row.detail,
    category: row.category,
    brand: row.brand,
    thickness: row.thickness,
    price: Number(row.price),
    image: row.image_url,
    heroImage: row.hero_image_url || undefined,
    badge: row.badge || undefined,
    description: row.description || undefined,
    colors: [...(row.product_variants || [])]
      .filter((variant) => variant.is_active !== false)
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
      .map((variant) => ({
        id: variant.id,
        name: variant.name,
        code: variant.code,
        hex: variant.hex_color,
        image: variant.image_url || row.image_url,
        stockQuantity: variant.stock_quantity,
      })),
  };
}
