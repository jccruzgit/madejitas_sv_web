import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const baseUrl = "http://127.0.0.1:4173";
const outputDir = new URL("../.screenshots/", import.meta.url);
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});

async function assertPage(page, label) {
  await page.waitForLoadState("networkidle");
  const report = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    content: document.documentElement.scrollWidth,
    brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
  }));
  if (report.content > report.viewport + 1) throw new Error(`${label}: overflow horizontal ${report.content}px > ${report.viewport}px`);
  if (report.brokenImages.length) throw new Error(`${label}: ${report.brokenImages.length} imágenes no cargaron`);
}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const desktopErrors = [];
desktop.on("console", (message) => { if (message.type() === "error") desktopErrors.push(message.text()); });
desktop.on("pageerror", (error) => desktopErrors.push(error.message));

await desktop.goto(`${baseUrl}/#/home`);
await assertPage(desktop, "home desktop");
await desktop.screenshot({ path: new URL("home-desktop.png", outputDir).pathname.slice(1), fullPage: true });

await desktop.getByRole("button", { name: "Catálogo", exact: true }).click();
await desktop.waitForURL(/catalog/);
await assertPage(desktop, "catálogo desktop");
await desktop.screenshot({ path: new URL("catalog-desktop.png", outputDir).pathname.slice(1), fullPage: true });

await desktop.getByRole("button", { name: "Chenille Amigurumi", exact: true }).click();
await desktop.waitForURL(/product\/chenille-amigurumi/);
await assertPage(desktop, "producto desktop");
await desktop.screenshot({ path: new URL("product-desktop.png", outputDir).pathname.slice(1), fullPage: true });
await desktop.getByRole("button", { name: "Aumentar cantidad" }).nth(1).click();
await desktop.getByRole("button", { name: /Agregar 2 a mi cotización/ }).click();
await desktop.getByRole("button", { name: "Abrir mi cotización" }).click();
await desktop.locator(".quote-drawer.open").waitFor();
await desktop.getByRole("button", { name: /Preparar mi cotización/ }).click();
await desktop.waitForURL(/quote/);
await desktop.getByLabel("Nombre completo").fill("María López");
await desktop.getByLabel("WhatsApp").fill("6018 2667");
await desktop.getByLabel("Ciudad / Departamento").fill("San Salvador");
await desktop.getByRole("button", { name: "Generar mi cotización" }).click();
await desktop.locator(".quote-document.generated").waitFor();
await assertPage(desktop, "cotización desktop");
await desktop.screenshot({ path: new URL("quote-desktop.png", outputDir).pathname.slice(1), fullPage: true });

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const mobileErrors = [];
mobile.on("console", (message) => { if (message.type() === "error") mobileErrors.push(message.text()); });
mobile.on("pageerror", (error) => mobileErrors.push(error.message));
await mobile.goto(`${baseUrl}/#/home`);
await assertPage(mobile, "home mobile");
await mobile.screenshot({ path: new URL("home-mobile.png", outputDir).pathname.slice(1), fullPage: true });
await mobile.getByRole("button", { name: "Explorar catálogo" }).click();
await mobile.waitForURL(/catalog/);
await assertPage(mobile, "catálogo mobile");
await mobile.screenshot({ path: new URL("catalog-mobile.png", outputDir).pathname.slice(1), fullPage: true });

const errors = [...desktopErrors, ...mobileErrors];
await browser.close();
if (errors.length) throw new Error(`Errores del navegador:\n${errors.join("\n")}`);
console.log("Visual check OK: 6 vistas, flujo de cotización, imágenes y overflow validados.");
