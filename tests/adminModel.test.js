import test from "node:test";
import assert from "node:assert/strict";
import { emptyProduct, emptyVariant, productPayload, slugFromName, variantPayload } from "../src/adminModel.js";
import { getAdminAccess, uploadCatalogImage } from "../src/adminApi.js";

test("creates an unpublished product with a stable slug and normalized price", () => {
  const draft = {
    ...emptyProduct(4), name: "  Algodón Azul  ", category: "Algodón",
    brand: "Madejitas", thickness: "Medio", price: "4.255",
    image_url: "/images/algodon.jpg", is_published: true,
  };
  const result = productPayload(draft, true);
  assert.equal(result.id, "algodon-azul");
  assert.equal(result.name, "Algodón Azul");
  assert.equal(result.price, 4.26);
  assert.equal(result.is_published, false);
  assert.equal(slugFromName("Kit 6 piezas"), "kit-6-piezas");
});

test("rejects missing fields and unsafe image URLs", () => {
  const draft = { ...emptyProduct(), name: "Lana", category: "Hilos", brand: "Marca", thickness: "Fino", price: "5", image_url: "https://example.com/lana.jpg" };
  assert.throws(() => productPayload({ ...draft, image_url: "javascript:alert(1)" }, true), /URL HTTPS/);
  assert.throws(() => productPayload({ ...draft, image_url: "//example.com/a.jpg" }, true), /URL HTTPS/);
  assert.throws(() => productPayload({ ...draft, price: "-1" }, true), /precio válido/);
  assert.throws(() => productPayload({ ...draft, price: " " }, true), /precio válido/);
  assert.throws(() => productPayload({ ...draft, sort_order: " " }, true), /orden/);
  assert.throws(() => productPayload({ ...draft, name: " " }, true), /obligatorios/);
});

test("distinguishes unknown stock from sold-out stock", () => {
  const draft = { ...emptyVariant(), name: "Rosa", code: "R01" };
  assert.equal(variantPayload(draft).stock_quantity, null);
  assert.equal(variantPayload({ ...draft, stock_quantity: "0" }).stock_quantity, 0);
  assert.throws(() => variantPayload({ ...draft, stock_quantity: "-1" }), /existencia/);
  assert.throws(() => variantPayload({ ...draft, hex_color: "pink" }), /color válido/);
});

test("keeps signed-out visitors out without querying admin membership", async () => {
  const client = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: () => { throw new Error("getUser should not run"); },
    },
    from: () => { throw new Error("membership should not be queried"); },
  };
  assert.deepEqual(await getAdminAccess(client), { status: "signed-out", email: "" });
});

test("requires an app_admins row for a signed-in account", async () => {
  const client = (member) => ({
    auth: {
      getSession: async () => ({ data: { session: { access_token: "test" } }, error: null }),
      getUser: async () => ({ data: { user: { id: "user-1", email: "admin@example.com" } }, error: null }),
    },
    from: (table) => {
      assert.equal(table, "app_admins");
      return {
        select: () => ({
          eq: (column, value) => {
            assert.equal(column, "user_id");
            assert.equal(value, "user-1");
            return { maybeSingle: async () => ({ data: member ? { user_id: "user-1" } : null, error: null }) };
          },
        }),
      };
    },
  });
  assert.equal((await getAdminAccess(client(false))).status, "forbidden");
  assert.equal((await getAdminAccess(client(true))).status, "ready");
});

test("uploads only supported catalog images to the scoped bucket", async () => {
  const calls = [];
  const bucket = {
    upload: async (path, file, options) => {
      calls.push({ path, file, options });
      return { data: { path }, error: null };
    },
    getPublicUrl: (path) => ({ data: { publicUrl: `https://example.com/${path}` } }),
  };
  const client = { storage: { from: (name) => { assert.equal(name, "catalog-images"); return bucket; } } };
  const file = { type: "image/webp", size: 1024 };
  const url = await uploadCatalogImage(file, client);
  assert.match(url, /^https:\/\/example\.com\/catalog\/[0-9a-f-]+\.webp$/);
  assert.equal(calls[0].options.upsert, false);
  await assert.rejects(uploadCatalogImage({ type: "image/svg+xml", size: 10 }, client), /JPG, PNG o WebP/);
  await assert.rejects(uploadCatalogImage({ type: "image/png", size: 6 * 1024 * 1024 }, client), /5 MB/);
});
