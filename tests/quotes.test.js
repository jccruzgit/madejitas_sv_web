import test from "node:test";
import assert from "node:assert/strict";
import { quoteReference, submitQuote } from "../src/quoteApi.js";
import { fetchAdminQuotes, updateQuoteStatus } from "../src/adminQuotesApi.js";

const customer = { name: "Ana Perez", phone: "7777 8888", city: "San Salvador", comment: "Dos colores" };
const items = [{ color: { id: 12 }, quantity: 2 }];

test("submits only variant identifiers and receives a server snapshot", async () => {
  const expected = { quote_number: 42, items: [{ variant_id: 12, quantity: 2, unit_price: "5.00" }] };
  const client = { rpc: async (name, params) => {
    assert.equal(name, "submit_quote");
    assert.deepEqual(params, {
      p_request_id: "request-1", p_customer_name: "Ana Perez", p_customer_phone: "7777 8888",
      p_customer_city: "San Salvador", p_customer_comment: "Dos colores",
      p_items: [{ variant_id: 12, quantity: 2 }],
    });
    return { data: expected, error: null };
  } };
  assert.deepEqual(await submitQuote("request-1", customer, items, client), expected);
  assert.equal(quoteReference(42), "MDJ-000042");
});

test("does not report success after an RPC error or malformed response", async () => {
  await assert.rejects(submitQuote("id", customer, items, { rpc: async () => ({ data: null, error: { message: "Sin permiso" } }) }), /Sin permiso/);
  await assert.rejects(submitQuote("id", customer, items, { rpc: async () => ({ data: {}, error: null }) }), /confirmacion/);
  await assert.rejects(submitQuote("id", customer, [{ color: { id: undefined }, quantity: 1 }], { rpc: () => { throw new Error("Should not call RPC"); } }), /catalogo/);
});

test("admin quote listing uses server-side status and pagination", async () => {
  const calls = [];
  const query = {
    select: (columns, options) => { calls.push(["select", columns, options]); return query; },
    eq: (column, value) => { calls.push(["eq", column, value]); return query; },
    order: (column, options) => { calls.push(["order", column, options]); return query; },
    range: async (start, end) => { calls.push(["range", start, end]); return { data: [{ id: "quote-1" }], count: 31, error: null }; },
  };
  const result = await fetchAdminQuotes(1, "new", { from: (table) => { assert.equal(table, "quotes"); return query; } });
  assert.equal(result.count, 31);
  assert.deepEqual(calls.find((call) => call[0] === "eq"), ["eq", "status", "new"]);
  assert.deepEqual(calls.find((call) => call[0] === "range"), ["range", 30, 59]);
});

test("admin can update status but not send unsupported values", async () => {
  const calls = [];
  const query = {
    update: (value) => { calls.push(value); return query; },
    eq: () => query,
    select: () => query,
    single: async () => ({ data: { id: "quote-1", status: "reviewed" }, error: null }),
  };
  const client = { from: (table) => { assert.equal(table, "quotes"); return query; } };
  assert.deepEqual(await updateQuoteStatus("quote-1", "reviewed", client), { id: "quote-1", status: "reviewed" });
  assert.deepEqual(calls, [{ status: "reviewed" }]);
  await assert.rejects(updateQuoteStatus("quote-1", "unlisted", client), /no valido/);
});
