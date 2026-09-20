import { catalogClient } from "./catalogApi.js";
import { productPayload, variantPayload } from "./adminModel.js";

function clientOrThrow(client) {
  if (!client) throw new Error("Configura Supabase para usar el panel.");
  return client;
}

function resultOrThrow(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export async function getAdminAccess(client = catalogClient) {
  clientOrThrow(client);
  const { data: sessionData, error: sessionError } = await client.auth.getSession();
  if (sessionError) throw new Error(sessionError.message);
  if (!sessionData.session) return { status: "signed-out", email: "" };
  const { data, error } = await client.auth.getUser();
  if (error) throw new Error(error.message);
  if (!data.user) return { status: "signed-out", email: "" };

  const member = resultOrThrow(await client.from("app_admins")
    .select("user_id").eq("user_id", data.user.id).maybeSingle());
  return { status: member ? "ready" : "forbidden", email: data.user.email || "" };
}

export async function fetchAdminProducts(client = catalogClient) {
  clientOrThrow(client);
  const rows = resultOrThrow(await client.from("products")
    .select("id, name, detail, category, brand, thickness, price, image_url, hero_image_url, badge, description, is_published, sort_order, product_variants (id, product_id, name, code, hex_color, image_url, stock_quantity, is_active, sort_order)")
    .order("sort_order", { ascending: true }).order("name", { ascending: true }));
  return rows.map((row) => ({
    ...row,
    product_variants: [...(row.product_variants || [])]
      .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
  }));
}

export async function saveAdminProduct(draft, isNew, client = catalogClient) {
  clientOrThrow(client);
  const payload = productPayload(draft, isNew);
  const query = isNew
    ? client.from("products").insert(payload)
    : client.from("products").update(payload).eq("id", draft.id);
  return resultOrThrow(await query.select("id").single());
}

export async function deleteAdminProduct(id, client = catalogClient) {
  clientOrThrow(client);
  return resultOrThrow(await client.from("products")
    .delete().eq("id", id).select("id").single());
}

export async function saveAdminVariant(productId, draft, client = catalogClient) {
  clientOrThrow(client);
  const payload = variantPayload(draft);
  const query = draft.id
    ? client.from("product_variants").update(payload).eq("id", draft.id).eq("product_id", productId)
    : client.from("product_variants").insert({ ...payload, product_id: productId });
  return resultOrThrow(await query.select("id").single());
}

export async function deleteAdminVariant(productId, id, client = catalogClient) {
  clientOrThrow(client);
  return resultOrThrow(await client.from("product_variants")
    .delete().eq("id", id).eq("product_id", productId).select("id").single());
}

export async function uploadCatalogImage(file, client = catalogClient) {
  clientOrThrow(client);
  const extensions = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
  const extension = extensions[file?.type];
  if (!extension) throw new Error("Usa una imagen JPG, PNG o WebP.");
  if (file.size > 5 * 1024 * 1024) throw new Error("La imagen debe pesar 5 MB o menos.");
  const path = `catalog/${crypto.randomUUID()}.${extension}`;
  const bucket = client.storage.from("catalog-images");
  const { error } = await bucket.upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
  if (error) throw new Error(error.message);
  return bucket.getPublicUrl(path).data.publicUrl;
}
