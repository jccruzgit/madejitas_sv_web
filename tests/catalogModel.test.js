import assert from "node:assert/strict";
import test from "node:test";
import { mapCatalogRow } from "../src/catalogModel.js";
import { fetchPublishedCatalog } from "../src/catalogApi.js";

test("maps a database product with ordered variants and numeric price", () => {
  const result = mapCatalogRow({
    id: "chenille-amigurumi",
    name: "Chenille Amigurumi",
    detail: "100 g",
    category: "Chenille",
    brand: "Círculo",
    thickness: "Grueso",
    price: "6.00",
    image_url: "/images/chenille.jpg",
    hero_image_url: null,
    badge: null,
    description: null,
    product_variants: [
      { id: 2, name: "Lila", code: "6000", hex_color: "#ca9ddb", image_url: null, stock_quantity: 0, is_active: true, sort_order: 2 },
      { id: 1, name: "Chantilly", code: "7563", hex_color: "#c9a9df", image_url: "/images/chenille.jpg", stock_quantity: null, is_active: true, sort_order: 1 },
      { id: 3, name: "Oculto", code: "9999", hex_color: "#000000", image_url: null, stock_quantity: 5, is_active: false, sort_order: 3 },
    ],
  });

  assert.equal(result.price, 6);
  assert.deepEqual(result.colors.map((color) => color.code), ["7563", "6000"]);
  assert.equal(result.colors[1].stockQuantity, 0);
  assert.equal(result.colors[1].image, "/images/chenille.jpg");
});

test("fetches published products and maps the Supabase response", async () => {
  const calls = [];
  const client = {
    from(table) {
      calls.push(["from", table]);
      return {
        select() {
          calls.push(["select"]);
          return this;
        },
        eq(column, value) {
          calls.push(["eq", column, value]);
          return this;
        },
        order(column) {
          calls.push(["order", column]);
          return Promise.resolve({
            error: null,
            data: [{
              id: "hilo-amigurumi", name: "Hilo Amigurumi", detail: "125 g",
              category: "Amigurumi", brand: "Círculo", thickness: "Fino",
              price: "4.50", image_url: "/images/hilo-amigurumi.jpg",
              product_variants: [{
                id: 1, name: "Chantilly", code: "7563", hex_color: "#ead8ca",
                image_url: null, stock_quantity: null, is_active: true, sort_order: 0,
              }],
            }],
          });
        },
      };
    },
  };

  const products = await fetchPublishedCatalog(client);
  assert.deepEqual(calls, [
    ["from", "products"], ["select"], ["eq", "is_published", true], ["order", "sort_order"],
  ]);
  assert.equal(products.length, 1);
  assert.equal(products[0].price, 4.5);
  assert.equal(products[0].colors[0].name, "Chantilly");
});

test("does not silently return demo products when Supabase fails", async () => {
  const client = {
    from() {
      return {
        select() { return this; },
        eq() { return this; },
        order() { return Promise.resolve({ data: null, error: { message: "Network failed" } }); },
      };
    },
  };
  await assert.rejects(fetchPublishedCatalog(client), /Network failed/);
});
