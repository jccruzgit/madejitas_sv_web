const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function slugFromName(name) {
  return name.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function imageUrl(value, label, required = false) {
  const url = value.trim();
  if (required && !url) throw new Error(`${label} es obligatoria.`);
  if (url && !url.startsWith("/")) {
    try {
      if (new URL(url).protocol !== "https:") throw new Error();
    } catch {
      throw new Error(`${label} debe ser una ruta local o una URL HTTPS.`);
    }
  }
  if (url.startsWith("//") || url === "/") throw new Error(`${label} debe ser una ruta local o una URL HTTPS.`);
  return url || null;
}

function integer(value, label) {
  if (String(value).trim() === "") throw new Error(`${label} debe ser un entero mayor o igual a cero.`);
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw new Error(`${label} debe ser un entero mayor o igual a cero.`);
  return number;
}

export function emptyProduct(nextOrder = 0) {
  return {
    id: "", name: "", detail: "", category: "", brand: "", thickness: "",
    price: "", image_url: "", hero_image_url: "", badge: "", description: "",
    is_published: false, sort_order: nextOrder,
  };
}

export function productDraft(row) {
  return {
    id: row.id, name: row.name, detail: row.detail || "", category: row.category,
    brand: row.brand, thickness: row.thickness, price: String(row.price),
    image_url: row.image_url, hero_image_url: row.hero_image_url || "",
    badge: row.badge || "", description: row.description || "",
    is_published: row.is_published, sort_order: row.sort_order,
  };
}

export function productPayload(draft, isNew) {
  const name = draft.name.trim();
  const category = draft.category.trim();
  const brand = draft.brand.trim();
  const thickness = draft.thickness.trim();
  if (!name || !category || !brand || !thickness) {
    throw new Error("Nombre, categoría, marca y grosor son obligatorios.");
  }
  const price = Number(draft.price);
  if (String(draft.price).trim() === "" || !Number.isFinite(price) || price < 0 || price > 99999999) {
    throw new Error("Introduce un precio válido mayor o igual a cero.");
  }
  const payload = {
    name, detail: draft.detail.trim(), category, brand, thickness,
    price: Math.round(price * 100) / 100,
    image_url: imageUrl(draft.image_url, "La imagen principal", true),
    hero_image_url: imageUrl(draft.hero_image_url, "La imagen de detalle"),
    badge: draft.badge.trim() || null,
    description: draft.description.trim() || null,
    is_published: Boolean(draft.is_published),
    sort_order: integer(draft.sort_order, "El orden"),
    updated_at: new Date().toISOString(),
  };
  if (isNew) {
    const id = slugFromName(name);
    if (!id) throw new Error("El nombre debe contener letras o números.");
    payload.id = id;
    payload.is_published = false;
  }
  return payload;
}

export function emptyVariant(nextOrder = 0) {
  return {
    id: null, name: "", code: "", hex_color: "#b389a8", image_url: "",
    stock_quantity: "", is_active: true, sort_order: nextOrder,
  };
}

export function variantDraft(row) {
  return {
    id: row.id, name: row.name, code: row.code, hex_color: row.hex_color,
    image_url: row.image_url || "", stock_quantity: row.stock_quantity ?? "",
    is_active: row.is_active, sort_order: row.sort_order,
  };
}

export function variantPayload(draft) {
  const name = draft.name.trim();
  const code = draft.code.trim();
  if (!name || !code) throw new Error("Nombre y código del color son obligatorios.");
  if (!HEX_COLOR.test(draft.hex_color)) throw new Error("Selecciona un color válido.");
  const stock = draft.stock_quantity === "" || draft.stock_quantity === null
    ? null : integer(draft.stock_quantity, "La existencia");
  return {
    name, code, hex_color: draft.hex_color,
    image_url: imageUrl(draft.image_url, "La imagen del color"),
    stock_quantity: stock, is_active: Boolean(draft.is_active),
    sort_order: integer(draft.sort_order, "El orden"),
  };
}
