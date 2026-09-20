import { catalogClient } from "./catalogApi.js";

export function quoteReference(number) {
  return `MDJ-${String(number).padStart(6, "0")}`;
}

export function quoteRequestItems(items) {
  return items.map((item) => ({ variant_id: item.color.id, quantity: item.quantity }));
}

export async function submitQuote(requestId, customer, items, client = catalogClient) {
  if (!client) throw new Error("Configura Supabase para registrar cotizaciones.");
  if (items.some((item) => !Number.isSafeInteger(item.color.id))) {
    throw new Error("Actualiza el catalogo antes de enviar la cotizacion.");
  }
  const { data, error } = await client.rpc("submit_quote", {
    p_request_id: requestId,
    p_customer_name: customer.name,
    p_customer_phone: customer.phone,
    p_customer_city: customer.city,
    p_customer_comment: customer.comment,
    p_items: quoteRequestItems(items),
  });
  if (error) throw new Error(error.message);
  if (!data?.quote_number || !Array.isArray(data.items)) {
    throw new Error("No se recibio la confirmacion de la cotizacion. Intenta de nuevo.");
  }
  return data;
}
