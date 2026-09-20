import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { createServer } from "vite";

process.env.VITE_SUPABASE_URL = "https://madejitas-test.supabase.co";
process.env.VITE_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root: projectRoot,
  server: { host: "127.0.0.1", port: 0 },
});

let browser;
try {
  await server.listen();
  const port = server.httpServer.address().port;
  browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.route("https://madejitas-test.supabase.co/rest/v1/products*", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "apikey,authorization,content-type,x-client-info",
        "content-type": "application/json",
      },
      body: JSON.stringify([{
        id: "catalog-test",
        name: "Hilado de prueba",
        detail: "100 g",
        category: "Algodón",
        brand: "Madejitas",
        thickness: "Medio",
        price: "7.25",
        image_url: "/images/algodon.jpg",
        hero_image_url: null,
        badge: null,
        description: "Producto de prueba",
        product_variants: [{
          id: 1, name: "Turquesa", code: "T01", hex_color: "#11abc7",
          image_url: null, stock_quantity: 4, is_active: true, sort_order: 0,
        }],
      }]),
    });
  });

  await page.goto(`http://127.0.0.1:${port}/#/catalog`);
  await page.getByRole("button", { name: "Hilado de prueba", exact: true }).waitFor();
  if (await page.locator(".product-card").count() !== 1) {
    throw new Error("El catálogo no mostró únicamente el producto remoto.");
  }
  if (!await page.getByText("Desde $7.25").isVisible()) {
    throw new Error("El precio remoto no se mostró correctamente.");
  }
  if (pageErrors.length) throw new Error(pageErrors.join("\n"));
  console.log("Catálogo remoto simulado: OK.");
} finally {
  await browser?.close();
  await server.close();
}
