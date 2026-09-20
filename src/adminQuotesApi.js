import { catalogClient } from "./catalogApi.js";

export const QUOTE_STATUSES = ["new", "reviewed", "confirmed", "sent", "cancelled"];

export async function fetchAdminQuotes(page = 0, status = "all", client = catalogClient) {
  if (!client) throw new Error("Configura Supabase para usar el panel.");
  const start = page * 30;
  if (status !== "all" && !QUOTE_STATUSES.includes(status)) throw new Error("Filtro de estado no valido.");
  let query = client.from("quotes")
    .select("id, quote_number, customer_name, customer_phone, customer_city, customer_comment, subtotal, shipping, total, status, created_at, quote_items (id, product_name, variant_name, variant_code, quantity, unit_price, line_total)", { count: "exact" });
  if (status !== "all") query = query.eq("status", status);
  const { data, error, count } = await query
    .order("created_at", { ascending: false })
    .range(start, start + 29);
  if (error) throw new Error(error.message);
  return { rows: data || [], count: count || 0 };
}

export async function updateQuoteStatus(id, status, client = catalogClient) {
  if (!client) throw new Error("Configura Supabase para usar el panel.");
  if (!QUOTE_STATUSES.includes(status)) throw new Error("Estado de cotizacion no valido.");
  const { data, error } = await client.from("quotes")
    .update({ status }).eq("id", id).select("id, status").single();
  if (error) throw new Error(error.message);
  return data;
}
