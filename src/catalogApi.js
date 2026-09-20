import { createClient } from "@supabase/supabase-js";
import { mapCatalogRow } from "./catalogModel.js";

const env = import.meta.env || {};
const url = env.VITE_SUPABASE_URL;
const publishableKey = env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const catalogConfigError = Boolean(url) !== Boolean(publishableKey);
export const catalogClient = url && publishableKey
  ? createClient(url, publishableKey)
  : null;

export async function fetchPublishedCatalog(client = catalogClient) {
  if (!client) throw new Error("Supabase no está configurado.");

  const { data, error } = await client
    .from("products")
    .select(`
      id, name, detail, category, brand, thickness, price,
      image_url, hero_image_url, badge, description,
      product_variants (
        id, name, code, hex_color, image_url, stock_quantity,
        is_active, sort_order
      )
    `)
    .eq("is_published", true)
    .order("sort_order", { ascending: true });

  if (error) throw new Error(error.message);
  return (data || []).map(mapCatalogRow).filter((product) => product.colors.length > 0);
}
