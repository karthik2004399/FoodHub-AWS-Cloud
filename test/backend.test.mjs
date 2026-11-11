import assert from "node:assert/strict";
import crypto from "node:crypto";
import { handler as menuHandler } from "../backend/menu.mjs";
import { handler as orderHandler } from "../backend/order.mjs";
import { handler as adminHandler } from "../backend/admin.mjs";
import { handler as contactHandler } from "../backend/contact.mjs";

// Set a secret key for test execution
const TEST_JWT_SECRET = "foodhub-test-secret-2026-secure-key";
process.env.JWT_SECRET = TEST_JWT_SECRET;

// Helper to base64url encode buffers
function base64Url(buf) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Helper to create genuinely signed JWT tokens
function createSignedJwt(payload, secret = TEST_JWT_SECRET, alg = "HS256") {
  const header = base64Url(Buffer.from(JSON.stringify({ alg, typ: "JWT" })));
  const body = base64Url(Buffer.from(JSON.stringify(payload)));
  const sig = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${body}`)
    .digest();
  return `${header}.${body}.${base64Url(sig)}`;
}

const validAdminToken = createSignedJwt({
  sub: "admin-usr-001",
  email: "admin@foodhub.com",
  role: "admin",
  "cognito:groups": ["admin"],
  exp: Math.floor(Date.now() / 1000) + 3600,
});

const validCustomerToken = createSignedJwt({
  sub: "cust-usr-002",
  email: "customer@example.com",
  role: "customer",
  "cognito:groups": ["customer"],
  exp: Math.floor(Date.now() / 1000) + 3600,
});

const expiredAdminToken = createSignedJwt({
  sub: "admin-usr-003",
  email: "admin@foodhub.com",
  role: "admin",
  "cognito:groups": ["admin"],
  exp: Math.floor(Date.now() / 1000) - 120, // Expired 2 minutes ago
});

const cognitoPureAdminToken = createSignedJwt({
  sub: "cognito-usr-777",
  email: "admin.director@foodhub.com",
  "cognito:groups": ["admin"],
  exp: Math.floor(Date.now() / 1000) + 3600,
});

const cognitoPureCustomerToken = createSignedJwt({
  sub: "cognito-usr-888",
  email: "customer.patron@example.com",
  "cognito:groups": ["customer"],
  exp: Math.floor(Date.now() / 1000) + 3600,
});

console.log("=== FOODHUB BACKEND & ADMIN API AUTOMATED TEST SUITE ===\n");

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(err);
    failed++;
  }
}

// ----------------------------------------------------------------------------
// 1. JWT SECURITY & CRYPTOGRAPHIC VERIFICATION TESTS
// ----------------------------------------------------------------------------
await test("Admin API rejects request with missing Authorization header (401)", async () => {
  const res = await adminHandler({
    httpMethod: "POST",
    path: "/admin/menu",
    headers: {},
    body: JSON.stringify({ name: "Pizza", price: 299 }),
  });
  assert.equal(res.statusCode, 401);
  const data = JSON.parse(res.body);
  assert.match(data.message, /Authorization header missing/);
});

await test("Admin API rejects malformed token format (401)", async () => {
  const res = await adminHandler({
    httpMethod: "GET",
    path: "/admin/orders",
    headers: { authorization: "Bearer invalid-token-without-dots" },
  });
  assert.equal(res.statusCode, 401);
});

await test("Admin API rejects token with alg 'none' (401)", async () => {
  const header = base64Url(Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })));
  const body = base64Url(Buffer.from(JSON.stringify({ role: "admin" })));
  const noneToken = `${header}.${body}.`;
  const res = await adminHandler({
    httpMethod: "GET",
    path: "/admin/orders",
    headers: { authorization: `Bearer ${noneToken}` },
  });
  assert.equal(res.statusCode, 401);
  assert.match(JSON.parse(res.body).message, /none/);
});

await test("Admin API rejects token with tampered payload / invalid HMAC signature (401)", async () => {
  // Take valid token, replace customer role with admin without re-signing with correct secret
  const parts = validCustomerToken.split(".");
  const tamperedPayload = base64Url(
    Buffer.from(JSON.stringify({ sub: "cust", role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 }))
  );
  const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

  const res = await adminHandler({
    httpMethod: "POST",
    path: "/admin/menu",
    headers: { authorization: `Bearer ${tamperedToken}` },
    body: JSON.stringify({ name: "Sushi", price: 499 }),
  });
  assert.equal(res.statusCode, 401);
  assert.match(JSON.parse(res.body).message, /signature/i);
});

await test("Admin API rejects token signed with wrong secret (401)", async () => {
  const forgedToken = createSignedJwt(
    { sub: "admin", role: "admin", exp: Math.floor(Date.now() / 1000) + 3600 },
    "wrong-unauthorized-secret"
  );
  const res = await adminHandler({
    httpMethod: "GET",
    path: "/admin/orders",
    headers: { authorization: `Bearer ${forgedToken}` },
  });
  assert.equal(res.statusCode, 401);
});

await test("Admin API rejects expired admin token (401)", async () => {
  const res = await adminHandler({
    httpMethod: "GET",
    path: "/admin/orders",
    headers: { authorization: `Bearer ${expiredAdminToken}` },
  });
  assert.equal(res.statusCode, 401);
  assert.match(JSON.parse(res.body).message, /expired/i);
});

await test("Admin API rejects genuine token with customer role (403 Forbidden)", async () => {
  const res = await adminHandler({
    httpMethod: "GET",
    path: "/admin/orders",
    headers: { authorization: `Bearer ${validCustomerToken}` },
  });
  assert.equal(res.statusCode, 403);
  assert.match(JSON.parse(res.body).message, /Admin role claim required/);
});

await test("Admin API accepts Cognito authorizer claims context with admin group", async () => {
  const res = await adminHandler({
    httpMethod: "GET",
    path: "/admin/orders",
    requestContext: {
      authorizer: {
        claims: {
          sub: "cognito-admin-1",
          email: "cognito.admin@foodhub.com",
          "cognito:groups": ["admin"],
        },
      },
    },
  });
  assert.equal(res.statusCode, 200);
});

// ----------------------------------------------------------------------------
// 2. UNIFIED ADMIN ROUTER (backend/admin.mjs) TESTS
// ----------------------------------------------------------------------------
await test("OPTIONS /admin/menu returns 204 preflight with CORS headers", async () => {
  const res = await adminHandler({ httpMethod: "OPTIONS", path: "/admin/menu" });
  assert.equal(res.statusCode, 204);
  assert.equal(res.headers["Access-Control-Allow-Origin"], "*");
  assert.ok(res.headers["Access-Control-Allow-Methods"].includes("PATCH"));
});

await test("POST /admin/menu validates required fields", async () => {
  const res = await adminHandler({
    httpMethod: "POST",
    path: "/admin/menu",
    headers: { authorization: `Bearer ${validAdminToken}` },
    body: JSON.stringify({ name: "", price: 0 }),
  });
  assert.equal(res.statusCode, 400);
});

await test("POST /admin/menu creates new dish with valid admin token (201)", async () => {
  const res = await adminHandler({
    httpMethod: "POST",
    path: "/admin/menu",
    headers: { authorization: `Bearer ${validAdminToken}` },
    body: JSON.stringify({
      name: "Tandoori Paneer Calzone",
      description: "Baked folded pizza stuffed with spicy paneer and cheese",
      category: "Pizza",
      price: 349,
      available: true,
    }),
  });
  assert.equal(res.statusCode, 201);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.equal(data.item.name, "Tandoori Paneer Calzone");
  assert.equal(data.item.price, 349);
});

await test("PUT /admin/menu/{itemId} updates food item and price", async () => {
  const res = await adminHandler({
    httpMethod: "PUT",
    path: "/admin/menu/1",
    pathParameters: { itemId: "1" },
    headers: { authorization: `Bearer ${validAdminToken}` },
    body: JSON.stringify({
      price: 319,
      available: false,
    }),
  });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.equal(data.item.price, 319);
  assert.equal(data.item.available, false);
});

await test("DELETE /admin/menu/{itemId} removes food item", async () => {
  const res = await adminHandler({
    httpMethod: "DELETE",
    path: "/admin/menu/ITEM-12345",
    pathParameters: { itemId: "ITEM-12345" },
    headers: { authorization: `Bearer ${validAdminToken}` },
  });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.equal(data.itemId, "ITEM-12345");
});

await test("GET /admin/orders returns orders array for authorized admin", async () => {
  const res = await adminHandler({
    httpMethod: "GET",
    path: "/admin/orders",
    headers: { authorization: `Bearer ${validAdminToken}` },
  });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.ok(Array.isArray(data.orders));
});

await test("PATCH /admin/orders/{orderId} validates order status enum", async () => {
  const res = await adminHandler({
    httpMethod: "PATCH",
    path: "/admin/orders/ORD-001",
    pathParameters: { orderId: "ORD-001" },
    headers: { authorization: `Bearer ${validAdminToken}` },
    body: JSON.stringify({ status: "InvalidStatusEnum" }),
  });
  assert.equal(res.statusCode, 400);
  assert.match(JSON.parse(res.body).message, /Invalid status/);
});

await test("PATCH /admin/orders/{orderId} updates status to 'Delivered' (200)", async () => {
  const res = await adminHandler({
    httpMethod: "PATCH",
    path: "/admin/orders/ORD-9999",
    pathParameters: { orderId: "ORD-9999" },
    headers: { authorization: `Bearer ${validAdminToken}` },
    body: JSON.stringify({ status: "Delivered" }),
  });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.equal(data.order.status, "Delivered");
});

await test("Unrecognized route on admin API returns 404", async () => {
  const res = await adminHandler({
    httpMethod: "GET",
    path: "/admin/non-existent-endpoint",
    headers: { authorization: `Bearer ${validAdminToken}` },
  });
  assert.equal(res.statusCode, 404);
  assert.match(JSON.parse(res.body).message, /not found/i);
});

// ----------------------------------------------------------------------------
// 3. PUBLIC API TESTS (Menu, Orders, Contact)
// ----------------------------------------------------------------------------
await test("GET /menu returns 200 and food catalog", async () => {
  const res = await menuHandler({ httpMethod: "GET" });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.ok(data.data.length >= 6);
});

await test("POST /orders validates customer delivery info", async () => {
  const res = await orderHandler({
    httpMethod: "POST",
    body: JSON.stringify({ customer: { name: "" }, items: [{ id: 1, quantity: 1 }] }),
  });
  assert.equal(res.statusCode, 400);
});

await test("POST /orders validates 10-digit phone number", async () => {
  const res = await orderHandler({
    httpMethod: "POST",
    body: JSON.stringify({
      customer: { name: "John", phone: "12345", address: "Mumbai" },
      items: [{ id: 1, quantity: 1 }],
    }),
  });
  assert.equal(res.statusCode, 400);
  assert.match(JSON.parse(res.body).message, /10-digit/);
});

await test("POST /orders validates item pricing and calculates flat delivery charge", async () => {
  // Dish #1: ₹299 x 1 = ₹299 + ₹40 delivery = ₹339
  const res = await orderHandler({
    httpMethod: "POST",
    body: JSON.stringify({
      customer: {
        name: "Karthik",
        phone: "9876543210",
        address: "Technology Park, Mumbai",
        city: "Mumbai",
        pincode: "400001",
      },
      items: [{ id: 1, quantity: 1 }],
    }),
  });
  assert.equal(res.statusCode, 201);
  const data = JSON.parse(res.body);
  assert.equal(data.order.subtotal, 299);
  assert.equal(data.order.deliveryFee, 40);
  assert.equal(data.order.total, 339);
});

await test("POST /contact validates inquiries and logs ticket", async () => {
  const res = await contactHandler({
    httpMethod: "POST",
    body: JSON.stringify({
      name: "Sanya",
      email: "sanya@example.com",
      phone: "9876543210",
      subject: "Catering",
      message: "Please share bulk order details.",
    }),
  });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.ok(data.inquiryId);
});

// ----------------------------------------------------------------------------
// 6. COGNITO CLAIMS & API GATEWAY GREEDY PROXY ROUTING TESTS
// ----------------------------------------------------------------------------
await test("Admin API authorizes token with pure cognito:groups ['admin'] (no legacy role field)", async () => {
  const res = await adminHandler({
    httpMethod: "GET",
    path: "/admin/orders",
    headers: { authorization: `Bearer ${cognitoPureAdminToken}` },
  });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
});

await test("Admin API rejects token with pure cognito:groups ['customer'] (403 Forbidden)", async () => {
  const res = await adminHandler({
    httpMethod: "GET",
    path: "/admin/orders",
    headers: { authorization: `Bearer ${cognitoPureCustomerToken}` },
  });
  assert.equal(res.statusCode, 403);
});

await test("Admin API routes API Gateway ANY /admin/{proxy+} with proxy='orders'", async () => {
  const res = await adminHandler({
    httpMethod: "GET",
    resource: "/admin/{proxy+}",
    path: "/prod/admin/orders",
    pathParameters: { proxy: "orders" },
    headers: { authorization: `Bearer ${validAdminToken}` },
  });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
});

await test("Admin API routes API Gateway ANY /admin/{proxy+} with proxy='menu' (POST /admin/menu)", async () => {
  const res = await adminHandler({
    httpMethod: "POST",
    resource: "/admin/{proxy+}",
    path: "/prod/admin/menu",
    pathParameters: { proxy: "menu" },
    headers: { authorization: `Bearer ${validAdminToken}` },
    body: JSON.stringify({
      name: "Cognito Cloud Burger",
      price: 189,
      category: "Burgers",
    }),
  });
  assert.equal(res.statusCode, 201);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.equal(data.item.name, "Cognito Cloud Burger");
});

await test("Admin API routes stage-prefixed path /prod/admin/orders without explicit proxy param", async () => {
  const res = await adminHandler({
    httpMethod: "GET",
    path: "/prod/admin/orders",
    headers: { authorization: `Bearer ${validAdminToken}` },
  });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
});

// ----------------------------------------------------------------------------
// 7. API GATEWAY HTTP API V2.0 PAYLOAD FORMAT & JWT AUTHORIZER TESTS
// ----------------------------------------------------------------------------
await test("HTTP API v2.0: Authorizes via event.requestContext.authorizer.jwt.claims with cognito:groups=['admin']", async () => {
  const res = await adminHandler({
    version: "2.0",
    routeKey: "ANY /admin/{proxy+}",
    rawPath: "/admin/orders",
    pathParameters: { proxy: "orders" },
    requestContext: {
      http: {
        method: "GET",
        path: "/admin/orders",
        protocol: "HTTP/1.1",
      },
      authorizer: {
        jwt: {
          claims: {
            sub: "cognito-sub-12345",
            email: "director@foodhub.com",
            "cognito:groups": ["admin"],
          },
          scopes: ["aws.cognito.signin.user.admin"],
        },
      },
    },
  });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
});

await test("HTTP API v2.0: Rejects non-admin in authorizer.jwt.claims (403 Forbidden)", async () => {
  const res = await adminHandler({
    version: "2.0",
    routeKey: "ANY /admin/{proxy+}",
    rawPath: "/admin/orders",
    pathParameters: { proxy: "orders" },
    requestContext: {
      http: {
        method: "GET",
        path: "/admin/orders",
      },
      authorizer: {
        jwt: {
          claims: {
            sub: "cognito-sub-67890",
            email: "shopper@example.com",
            "cognito:groups": ["customer"],
          },
        },
      },
    },
  });
  assert.equal(res.statusCode, 403);
  const data = JSON.parse(res.body);
  assert.match(data.message, /administrative privileges required/);
});

await test("HTTP API v2.0: Authorizes via event.requestContext.authorizer.jwt.scopes with ['admin']", async () => {
  const res = await adminHandler({
    version: "2.0",
    routeKey: "ANY /admin/{proxy+}",
    rawPath: "/admin/orders",
    pathParameters: { proxy: "orders" },
    requestContext: {
      http: {
        method: "GET",
        path: "/admin/orders",
      },
      authorizer: {
        jwt: {
          claims: {
            sub: "cognito-sub-99999",
            email: "service-admin@foodhub.com",
          },
          scopes: ["admin"],
        },
      },
    },
  });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
});

// ----------------------------------------------------------------------------
// 8. ORDER SUMMARY, AUTHORITATIVE PRICING & FAILURE SAFETY TESTS
// ----------------------------------------------------------------------------
await test("POST /orders sets status='Pending', rejects tampered client price, and returns complete summary", async () => {
  const res = await orderHandler({
    httpMethod: "POST",
    body: JSON.stringify({
      customer: {
        name: "Aarav Mehta",
        phone: "9876543210",
        address: "12 Marine Drive",
        city: "Mumbai",
        pincode: "400020",
      },
      paymentMethod: "UPI",
      items: [
        { id: 1, quantity: 2, price: 1 }, // Attempt tampered price ₹1 instead of ₹299
        { id: 2, quantity: 1, price: 5 }, // Attempt tampered price ₹5 instead of ₹199
      ],
      subtotal: 7,
      total: 7,
    }),
  });
  assert.equal(res.statusCode, 201);
  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.ok(data.order.orderId.startsWith("ORD-"));
  assert.ok(data.order.createdAt);
  assert.equal(data.order.status, "Pending");
  assert.equal(data.order.paymentMethod, "UPI");
  assert.equal(data.order.items.length, 2);
  assert.equal(data.order.items[0].price, 299);
  assert.equal(data.order.items[0].itemTotal, 598);
  assert.ok(data.order.items[0].image);
  // 299*2 + 199*1 = 797; delivery 40 -> 837
  assert.equal(data.order.subtotal, 797);
  assert.equal(data.order.deliveryFee, 40);
  assert.equal(data.order.total, 837);
});

await test("POST /orders generates unique orderId on consecutive calls", async () => {
  const payload = {
    customer: {
      name: "Neha",
      phone: "9876543211",
      address: "Indiranagar",
      city: "Bengaluru",
      pincode: "560038",
    },
    items: [{ id: 1, quantity: 1 }],
  };
  const res1 = await orderHandler({ httpMethod: "POST", body: JSON.stringify(payload) });
  const res2 = await orderHandler({ httpMethod: "POST", body: JSON.stringify(payload) });
  assert.equal(res1.statusCode, 201);
  assert.equal(res2.statusCode, 201);
  const o1 = JSON.parse(res1.body).order;
  const o2 = JSON.parse(res2.body).order;
  assert.notEqual(o1.orderId, o2.orderId);
});

await test("POST /orders rejects empty cart, invalid quantity, invalid pincode, and invalid paymentMethod", async () => {
  const emptyRes = await orderHandler({
    httpMethod: "POST",
    body: JSON.stringify({
      customer: { name: "Test", phone: "9876543210", address: "Addr" },
      items: [],
    }),
  });
  assert.equal(emptyRes.statusCode, 400);

  const badQtyRes = await orderHandler({
    httpMethod: "POST",
    body: JSON.stringify({
      customer: { name: "Test", phone: "9876543210", address: "Addr" },
      items: [{ id: 1, quantity: 0 }],
    }),
  });
  assert.equal(badQtyRes.statusCode, 400);

  const badPinRes = await orderHandler({
    httpMethod: "POST",
    body: JSON.stringify({
      customer: { name: "Test", phone: "9876543210", address: "Addr", pincode: "123" },
      items: [{ id: 1, quantity: 1 }],
    }),
  });
  assert.equal(badPinRes.statusCode, 400);

  const badPayRes = await orderHandler({
    httpMethod: "POST",
    body: JSON.stringify({
      customer: { name: "Test", phone: "9876543210", address: "Addr", pincode: "400001" },
      paymentMethod: "CryptoCoin",
      items: [{ id: 1, quantity: 1 }],
    }),
  });
  assert.equal(badPayRes.statusCode, 400);

  const unknownItemRes = await orderHandler({
    httpMethod: "POST",
    body: JSON.stringify({
      customer: { name: "Test", phone: "9876543210", address: "Addr", pincode: "400001" },
      items: [{ id: 99999, quantity: 1 }],
    }),
  });
  assert.equal(unknownItemRes.statusCode, 400);
});

await test("POST /orders returns 500 when DynamoDB persistence fails inside AWS Lambda", async () => {
  const prevFn = process.env.AWS_LAMBDA_FUNCTION_NAME;
  process.env.AWS_LAMBDA_FUNCTION_NAME = "FoodHubCreateOrder-Test";
  try {
    const res = await orderHandler({
      httpMethod: "POST",
      body: JSON.stringify({
        customer: {
          name: "Priya",
          phone: "9876543210",
          address: "Bandra West",
          city: "Mumbai",
          pincode: "400050",
        },
        items: [{ id: 1, quantity: 1 }],
      }),
    });
    assert.equal(res.statusCode, 500);
    const data = JSON.parse(res.body);
    assert.equal(data.success, false);
  } finally {
    if (prevFn === undefined) {
      delete process.env.AWS_LAMBDA_FUNCTION_NAME;
    } else {
      process.env.AWS_LAMBDA_FUNCTION_NAME = prevFn;
    }
  }
});

await test("PATCH /admin/orders/{orderId} accepts 'Pending' status", async () => {
  const res = await adminHandler({
    httpMethod: "PATCH",
    path: "/admin/orders/ORD-1001",
    pathParameters: { orderId: "ORD-1001" },
    headers: { authorization: `Bearer ${validAdminToken}` },
    body: JSON.stringify({ status: "Pending" }),
  });
  assert.equal(res.statusCode, 200);
  const data = JSON.parse(res.body);
  assert.equal(data.order.status, "Pending");
});

console.log(`\n======================================================`);
console.log(`TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
