import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { createServer } from "vite";

process.env.VITE_SUPABASE_URL = "https://madejitas-admin-test.supabase.co";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({ root: projectRoot, server: { host: "127.0.0.1", port: 0 } });
const user = { id: "admin-test", email: "admin@example.com", aud: "authenticated", role: "authenticated" };
const product = {
  id: "hilo-test", name: "Hilo de prueba", detail: "100 g", category: "Algodón",
  brand: "Madejitas", thickness: "Medio", price: "5.00",
  image_url: "/images/algodon.jpg", hero_image_url: null, badge: null,
  description: "Producto de prueba", is_published: true, sort_order: 0,
  product_variants: [{
    id: 1, product_id: "hilo-test", name: "Turquesa", code: "T01",
    hex_color: "#11abc7", image_url: null, stock_quantity: 4,
    is_active: true, sort_order: 0,
  }],
};
const otherProducts = Array.from({ length: 7 }, (_, index) => ({
  ...product,
  id: `material-${index + 1}`,
  name: `Material ${index + 1}`,
  sort_order: index + 1,
  product_variants: [],
}));
const quote = {
  id: "quote-test", quote_number: 42, customer_name: "Ana Perez",
  customer_phone: "77778888", customer_city: "San Salvador",
  customer_comment: "Entregar en la tarde", subtotal: "10.00", shipping: "3.50",
  total: "13.50", status: "new", created_at: "2026-09-20T10:00:00Z",
  quote_items: [{ id: 1, product_name: "Hilo de prueba", variant_name: "Turquesa", variant_code: "T01", quantity: 2, unit_price: "5.00", line_total: "10.00" }],
};

function fulfill(route, body, status = 200) {
  return route.fulfill({
    status,
    headers: {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "apikey,authorization,content-type,x-client-info,prefer",
      "access-control-allow-methods": "GET,POST,PATCH,DELETE,OPTIONS",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

let browser;
try {
  await server.listen();
  const port = server.httpServer.address().port;
  browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });

  const visitor = await browser.newPage();
  await visitor.goto(`http://127.0.0.1:${port}/#/admin`);
  await visitor.getByRole("button", { name: "Ingresar" }).waitFor();
  await visitor.close();

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.addInitScript(({ userData }) => {
    localStorage.setItem("sb-madejitas-admin-test-auth-token", JSON.stringify({
      access_token: "test-token", refresh_token: "test-refresh", token_type: "bearer",
      expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: userData,
    }));
  }, { userData: user });
  await page.route("https://madejitas-admin-test.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (request.method() === "OPTIONS") return fulfill(route, {});
    if (url.pathname === "/auth/v1/user") return fulfill(route, user);
    if (url.pathname === "/rest/v1/app_admins") return fulfill(route, { user_id: user.id });
    if (url.pathname === "/rest/v1/quotes") {
      if (request.method() === "PATCH") {
        quote.status = request.postDataJSON().status;
        return fulfill(route, { id: quote.id, status: quote.status });
      }
      return route.fulfill({ status: 200, headers: {
        "access-control-allow-origin": "*", "access-control-allow-headers": "apikey,authorization,content-type,x-client-info,prefer",
        "access-control-expose-headers": "content-range", "content-type": "application/json", "content-range": "0-0/1",
      }, body: JSON.stringify([quote]) });
    }
    if (url.pathname.startsWith("/storage/v1/object/catalog-images/catalog/") && ["POST", "PUT"].includes(request.method())) {
      return fulfill(route, { Key: url.pathname.replace("/storage/v1/object/", "") });
    }
    if (url.pathname.startsWith("/storage/v1/object/public/catalog-images/catalog/")) {
      return route.fulfill({
        status: 200,
        contentType: "image/png",
        body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==", "base64"),
      });
    }
    if (url.pathname === "/rest/v1/products") {
      if (request.method() === "PATCH") {
        Object.assign(product, request.postDataJSON());
        return fulfill(route, { id: product.id });
      }
      return fulfill(route, [product, ...otherProducts]);
    }
    if (url.pathname === "/rest/v1/product_variants" && request.method() === "POST") {
      const variant = { ...request.postDataJSON(), id: 2 };
      product.product_variants.push(variant);
      return fulfill(route, { id: variant.id });
    }
    return fulfill(route, { message: "Unexpected mock request" }, 404);
  });

  await page.goto(`http://127.0.0.1:${port}/#/admin`);
  await page.getByRole("heading", { name: "Ficha del producto" }).waitFor();
  await mkdir(new URL("../.screenshots/", import.meta.url), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL("../.screenshots/admin-desktop.png", import.meta.url)), fullPage: true });

  await page.getByLabel("Precio ($)").fill("7.50");
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await page.getByText("Producto guardado.").waitFor();
  if (Number(product.price) !== 7.5) throw new Error("El precio editado no llegó a la API.");

  await page.getByRole("button", { name: "Nuevo color" }).click();
  await page.getByRole("dialog").getByLabel("Nombre").fill("Coral");
  await page.getByRole("dialog").getByLabel("Código", { exact: true }).fill("C02");
  await page.getByRole("dialog").getByLabel("Existencias").fill("3");
  await page.getByRole("button", { name: "Guardar color" }).click();
  await page.getByRole("button", { name: /Coral C02/ }).waitFor();
  if (product.product_variants.length !== 2) throw new Error("El color nuevo no llegó a la API.");

  await page.locator(".admin-product-form .admin-image-field").first().locator('input[type="file"]').setInputFiles({
    name: "nuevo.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==", "base64"),
  });
  await page.waitForFunction(() => document.querySelector(".admin-product-form .admin-image-field input:not([type=file])")?.value.includes("/storage/v1/object/public/catalog-images/catalog/"));
  await page.getByRole("button", { name: "Guardar producto" }).click();
  await page.getByText("Producto guardado.").waitFor();
  if (!product.image_url.includes("/storage/v1/object/public/catalog-images/catalog/")) {
    throw new Error("La URL de la imagen subida no se guardó en la ficha.");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: fileURLToPath(new URL("../.screenshots/admin-mobile-viewport.png", import.meta.url)) });
  await page.screenshot({ path: fileURLToPath(new URL("../.screenshots/admin-mobile.png", import.meta.url)), fullPage: true });
  const listScroll = await page.locator(".admin-product-list").evaluate((node) => node.scrollHeight - node.clientHeight);
  if (listScroll <= 0) throw new Error("La lista móvil no permite desplazarse entre ocho productos.");
  const topbar = await page.locator(".admin-topbar").boundingBox();
  if (Math.abs(topbar.y) > 1) throw new Error(`Barra superior fuera del viewport: ${topbar.y}px`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 2) throw new Error(`Panel con desbordamiento horizontal: ${overflow}px`);
  await page.setViewportSize({ width: 320, height: 700 });
  await page.getByRole("button", { name: "Nuevo color" }).click();
  await page.screenshot({ path: fileURLToPath(new URL("../.screenshots/admin-modal-320.png", import.meta.url)) });
  const narrowOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (narrowOverflow > 2) throw new Error(`Modal con desbordamiento horizontal: ${narrowOverflow}px`);
  await page.getByRole("dialog").getByRole("button", { name: "Cancelar" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole("button", { name: "Cotizaciones", exact: true }).click();
  await page.getByRole("heading", { name: "MDJ-000042" }).waitFor();
  await page.screenshot({ path: fileURLToPath(new URL("../.screenshots/admin-quotes-desktop.png", import.meta.url)), fullPage: true });
  await page.getByLabel("Estado de la solicitud").selectOption("reviewed");
  await page.waitForFunction(() => document.querySelector(".admin-quote-detail .admin-status-label")?.textContent === "Revisada");
  if (quote.status !== "reviewed") throw new Error("El nuevo estado no llego a la API.");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: fileURLToPath(new URL("../.screenshots/admin-quotes-mobile.png", import.meta.url)), fullPage: true });
  await page.setViewportSize({ width: 320, height: 700 });
  const quoteOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (quoteOverflow > 2) throw new Error(`Cotizaciones con desbordamiento horizontal: ${quoteOverflow}px`);
  if (pageErrors.length) throw new Error(pageErrors.join("\n"));
  console.log("Panel admin simulado: acceso, edición, variante, imagen y móvil OK.");
} finally {
  await browser?.close();
  await server.close();
}
