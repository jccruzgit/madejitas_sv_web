import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { createServer } from "vite";

process.env.VITE_SUPABASE_URL = "https://madejitas-quote-test.supabase.co";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

const server = await createServer({ root: fileURLToPath(new URL("../", import.meta.url)), server: { host: "127.0.0.1", port: 0 } });
const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "apikey,authorization,content-type,x-client-info,prefer",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "content-type": "application/json",
};
let browser;
try {
  await server.listen();
  const port = server.httpServer.address().port;
  browser = await chromium.launch({ executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe", headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  const requestIds = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("https://madejitas-quote-test.supabase.co/**", (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "OPTIONS") return route.fulfill({ status: 200, headers, body: "{}" });
    if (path === "/rest/v1/products") return route.fulfill({ status: 200, headers, body: JSON.stringify([{
      id: "catalog-test", name: "Hilado de prueba", detail: "100 g", category: "Algodon",
      brand: "Madejitas", thickness: "Medio", price: "5.00", image_url: "/images/algodon.jpg",
      hero_image_url: null, badge: null, description: "Producto de prueba", product_variants: [
        { id: 1, name: "Turquesa", code: "T01", hex_color: "#11abc7", image_url: null, stock_quantity: 4, is_active: true, sort_order: 0 },
      ],
    }]) });
    if (path === "/rest/v1/rpc/submit_quote") {
      const body = request.postDataJSON();
      requestIds.push(body.p_request_id);
      if (requestIds.length === 1) return route.fulfill({ status: 400, headers, body: JSON.stringify({ message: "Error temporal simulado" }) });
      return route.fulfill({ status: 200, headers, body: JSON.stringify({
        quote_id: "quote-test", quote_number: 42, subtotal: "10.00", shipping: "3.50", total: "13.50",
        created_at: "2026-09-20T10:00:00Z", items: [{ variant_id: 1, product_name: "Hilado de prueba", variant_name: "Turquesa", variant_code: "T01", quantity: 2, unit_price: "5.00", line_total: "10.00" }],
      }) });
    }
    return route.fulfill({ status: 404, headers, body: JSON.stringify({ message: `Unexpected mock request: ${path}` }) });
  });

  await page.goto(`http://127.0.0.1:${port}/#/catalog`);
  await page.locator(".product-card").getByRole("button", { name: "Agregar", exact: true }).click();
  await page.getByRole("button", { name: "Abrir mi cotización" }).click();
  await page.locator(".quote-drawer").getByRole("button", { name: "Aumentar cantidad" }).click();
  await page.getByRole("button", { name: "Preparar mi cotización" }).click();
  await page.getByLabel("Nombre completo").fill("Ana Perez");
  await page.getByLabel("WhatsApp").fill("7777 8888");
  await page.getByLabel("Ciudad / Departamento").fill("San Salvador");
  await mkdir(new URL("../.screenshots/", import.meta.url), { recursive: true });
  await page.screenshot({ path: fileURLToPath(new URL("../.screenshots/quote-form-desktop.png", import.meta.url)), fullPage: true });
  await page.getByRole("button", { name: "Solicitar cotización" }).click();
  await page.getByRole("alert").getByText("Error temporal simulado").waitFor();
  await page.getByRole("button", { name: "Solicitar cotización" }).click();
  await page.getByText("Solicitud MDJ-000042 registrada.", { exact: false }).waitFor();
  if (requestIds.length !== 2 || requestIds[0] !== requestIds[1]) throw new Error("El reintento no mantuvo el identificador original.");
  if (await page.locator(".count-badge").count()) throw new Error("El carrito no se vacio tras registrar la cotizacion.");
  const whatsapp = await page.getByRole("link", { name: "Enviar por WhatsApp" }).getAttribute("href");
  if (!new URL(whatsapp).searchParams.get("text")?.includes("MDJ-000042")) throw new Error("WhatsApp no incluye la referencia registrada.");
  await page.locator(".toast").waitFor({ state: "hidden" });
  await page.screenshot({ path: fileURLToPath(new URL("../.screenshots/quote-saved-desktop.png", import.meta.url)), fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.screenshot({ path: fileURLToPath(new URL(`../.screenshots/quote-saved-${width}.png`, import.meta.url)), fullPage: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (overflow > 2) throw new Error(`Cotizacion con desbordamiento a ${width}px: ${overflow}px`);
  }
  if (pageErrors.length) throw new Error(pageErrors.join("\n"));
  console.log("Cotizacion simulada: error, reintento idempotente, confirmacion y movil OK.");
} finally {
  await browser?.close();
  await server.close();
}
