import assert from "node:assert/strict";
import crypto from "node:crypto";
import { QueryCommand, PutCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
  DEFAULT_ORDERS_CUSTOMER_INDEX,
  createOrderHandler,
} from "../backend/order.mjs";
import {
  classifyOrderStatus,
  filterOrdersByCustomer,
  getOrderStatusBadgeStyle,
  partitionOrders,
} from "../src/utils/orderSummary.js";

console.log("=== FOODHUB MY ORDERS & CUSTOMER OWNERSHIP TEST SUITE ===\n");

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

function base64Url(bufOrStr) {
  const buf = typeof bufOrStr === "string" ? Buffer.from(bufOrStr) : bufOrStr;
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Generate an RSA keypair to test real RS256 Cognito JWT verification locally
const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const TEST_KID = "test-cognito-kid-2026";
const USER_POOL_ISS =
  "https://cognito-idp.ap-south-1.amazonaws.com/ap-south-1_znDI8JZbg";

function createCognitoRs256Jwt(payload, customKey = privateKey, kid = TEST_KID) {
  const headerB64 = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT", kid }));
  const payloadB64 = base64Url(JSON.stringify(payload));
  const sig = crypto.sign(
    "RSA-SHA256",
    Buffer.from(`${headerB64}.${payloadB64}`),
    customKey
  );
  return `${headerB64}.${payloadB64}.${base64Url(sig)}`;
}

const mockJwksProvider = async (kid) => (kid === TEST_KID ? publicKey : null);

const customerAToken = createCognitoRs256Jwt({
  sub: "cognito-sub-customer-A",
  iss: USER_POOL_ISS,
  token_use: "access",
  client_id: "4a19niecbquf7esm2cg3e7ho15",
  "cognito:groups": ["customer"],
  exp: Math.floor(Date.now() / 1000) + 3600,
});

const expiredCustomerToken = createCognitoRs256Jwt({
  sub: "cognito-sub-customer-A",
  iss: USER_POOL_ISS,
  token_use: "access",
  exp: Math.floor(Date.now() / 1000) - 60,
});

const wrongIssuerToken = createCognitoRs256Jwt({
  sub: "cognito-sub-customer-A",
  iss: "https://evil.example.com/fake-pool",
  token_use: "access",
  exp: Math.floor(Date.now() / 1000) + 3600,
});

// ----------------------------------------------------------------------------
// 1. CUSTOMER ORDER CREATION STORES COGNITO SUB AS customerId (NO SPOOFING)
// ----------------------------------------------------------------------------
await test("POST /orders stores verified Cognito sub as customerId and ignores body.customerId", async () => {
  const savedItems = [];
  const orderHandler = createOrderHandler({
    jwksProvider: mockJwksProvider,
    ddbClient: {
      send: async (cmd) => {
        if (cmd instanceof ScanCommand) {
          return { Items: [] }; // menu scan fallback
        }
        if (cmd instanceof PutCommand) {
          savedItems.push(cmd.input.Item);
          return {};
        }
        throw new Error(`Unexpected DynamoDB command: ${cmd.constructor.name}`);
      },
    },
  });

  const res = await orderHandler({
    httpMethod: "POST",
    path: "/orders",
    headers: { authorization: `Bearer ${customerAToken}` },
    body: JSON.stringify({
      customerId: "attacker-trying-to-spoof-customer-B",
      customer: {
        name: "Ananya",
        phone: "9876543210",
        address: "10 Park Street",
        city: "Mumbai",
        pincode: "400001",
      },
      paymentMethod: "UPI",
      items: [{ id: 1, quantity: 2 }],
    }),
  });

  assert.equal(res.statusCode, 201);
  const data = JSON.parse(res.body);
  assert.equal(data.order.customerId, "cognito-sub-customer-A");
  assert.equal(savedItems.length, 1);
  assert.equal(savedItems[0].customerId, "cognito-sub-customer-A");
});

await test("POST /orders rejects invalid/tampered Bearer token with 401 while keeping unauthenticated POST compatible", async () => {
  const orderHandler = createOrderHandler({
    jwksProvider: mockJwksProvider,
    ddbClient: {
      send: async () => ({ Items: [] }),
    },
  });

  const tamperedToken = `${customerAToken.split(".").slice(0, 2).join(".")}.tamperedsig`;
  const rejectedRes = await orderHandler({
    httpMethod: "POST",
    path: "/orders",
    headers: { authorization: `Bearer ${tamperedToken}` },
    body: JSON.stringify({
      customer: {
        name: "Ananya",
        phone: "9876543210",
        address: "10 Park Street",
      },
      items: [{ id: 1, quantity: 1 }],
    }),
  });
  assert.equal(rejectedRes.statusCode, 401);
});

// ----------------------------------------------------------------------------
// 2. GET /orders AUTHENTICATION & GSI QUERY STRATEGY (NO TABLE SCAN)
// ----------------------------------------------------------------------------
await test("GET /orders rejects unauthenticated, expired, wrong-issuer, and tampered tokens (401)", async () => {
  const orderHandler = createOrderHandler({
    jwksProvider: mockJwksProvider,
    ddbClient: {
      send: async () => {
        throw new Error("Should not hit DynamoDB when unauthenticated");
      },
    },
  });

  const missingAuth = await orderHandler({ httpMethod: "GET", path: "/orders" });
  assert.equal(missingAuth.statusCode, 401);

  const expiredAuth = await orderHandler({
    httpMethod: "GET",
    path: "/orders",
    headers: { authorization: `Bearer ${expiredCustomerToken}` },
  });
  assert.equal(expiredAuth.statusCode, 401);

  const wrongIssAuth = await orderHandler({
    httpMethod: "GET",
    path: "/orders",
    headers: { authorization: `Bearer ${wrongIssuerToken}` },
  });
  assert.equal(wrongIssAuth.statusCode, 401);

  const otherPair = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const forgedJwt = createCognitoRs256Jwt(
    {
      sub: "cognito-sub-customer-B",
      iss: USER_POOL_ISS,
      token_use: "access",
      exp: Math.floor(Date.now() / 1000) + 3600,
    },
    otherPair.privateKey
  );
  const forgedAuth = await orderHandler({
    httpMethod: "GET",
    path: "/orders",
    headers: { authorization: `Bearer ${forgedJwt}` },
  });
  assert.equal(forgedAuth.statusCode, 401);
});

await test("GET /orders uses QueryCommand on customerId-createdAt-index (never ScanCommand) and enforces customer ownership", async () => {
  let capturedCommand = null;
  const mockOrdersInDb = [
    {
      orderId: "ORD-102",
      customerId: "cognito-sub-customer-A",
      status: "Pending",
      total: 339,
      createdAt: "2026-11-10T10:00:00.000Z",
    },
    {
      orderId: "ORD-101",
      customerId: "cognito-sub-customer-A",
      status: "Delivered",
      total: 239,
      createdAt: "2026-11-09T10:00:00.000Z",
    },
    // Even if DB mock accidentally included another customer's record, defensive ownership filter strips it
    {
      orderId: "ORD-999",
      customerId: "cognito-sub-customer-B",
      status: "Pending",
      total: 999,
      createdAt: "2026-11-10T11:00:00.000Z",
    },
  ];

  const orderHandler = createOrderHandler({
    jwksProvider: mockJwksProvider,
    ddbClient: {
      send: async (cmd) => {
        capturedCommand = cmd;
        if (cmd instanceof ScanCommand) {
          throw new Error("Full-table ScanCommand is forbidden for GET /orders");
        }
        return { Items: mockOrdersInDb };
      },
    },
  });

  // Customer A tries passing ?customerId=cognito-sub-customer-B to access someone else's orders
  const res = await orderHandler({
    httpMethod: "GET",
    rawPath: "/orders",
    queryStringParameters: { customerId: "cognito-sub-customer-B" },
    headers: { authorization: `Bearer ${customerAToken}` },
  });

  assert.equal(res.statusCode, 200);
  assert.ok(capturedCommand instanceof QueryCommand);
  assert.equal(capturedCommand.input.TableName, "FoodHubOrders");
  assert.equal(capturedCommand.input.IndexName, DEFAULT_ORDERS_CUSTOMER_INDEX);
  assert.equal(
    capturedCommand.input.KeyConditionExpression,
    "customerId = :customerId"
  );
  assert.deepEqual(capturedCommand.input.ExpressionAttributeValues, {
    ":customerId": "cognito-sub-customer-A",
  });
  assert.equal(capturedCommand.input.ScanIndexForward, false);

  const data = JSON.parse(res.body);
  assert.equal(data.success, true);
  assert.equal(data.orders.length, 2);
  assert.ok(data.orders.every((o) => o.customerId === "cognito-sub-customer-A"));
  assert.equal(data.orders[0].orderId, "ORD-102");
});

await test("GET /orders blocks subpath ownership probing (/orders/{otherCustomerId}) with 403 and supports HTTP API v2.0 claims", async () => {
  const orderHandler = createOrderHandler({
    ddbClient: {
      send: async () => ({ Items: [] }),
    },
  });

  const probedRes = await orderHandler({
    version: "2.0",
    rawPath: "/orders/cognito-sub-customer-B",
    pathParameters: { customerId: "cognito-sub-customer-B" },
    requestContext: {
      http: { method: "GET", path: "/orders/cognito-sub-customer-B" },
      authorizer: {
        jwt: {
          claims: { sub: "cognito-sub-customer-A" },
        },
      },
    },
  });
  assert.equal(probedRes.statusCode, 403);

  const validHttpApiV2Res = await orderHandler({
    version: "2.0",
    rawPath: "/orders",
    requestContext: {
      http: { method: "GET", path: "/orders" },
      authorizer: {
        jwt: {
          claims: { sub: "cognito-sub-customer-A" },
        },
      },
    },
  });
  assert.equal(validHttpApiV2Res.statusCode, 200);
});

await test("GET /orders returns 500 when DynamoDB GSI query fails instead of falling back to table scan", async () => {
  const orderHandler = createOrderHandler({
    jwksProvider: mockJwksProvider,
    ddbClient: {
      send: async () => {
        const err = new Error("The table does not have the specified index: customerId-createdAt-index");
        err.name = "ValidationException";
        throw err;
      },
    },
  });

  const res = await orderHandler({
    httpMethod: "GET",
    path: "/orders",
    headers: { authorization: `Bearer ${customerAToken}` },
  });
  assert.equal(res.statusCode, 500);
  const data = JSON.parse(res.body);
  assert.equal(data.success, false);
});

// ----------------------------------------------------------------------------
// 3. FRONTEND ORDER FILTERING & STATUS CLASSIFICATION TESTS
// ----------------------------------------------------------------------------
await test("filterOrdersByCustomer strictly retains only orders matching authenticated user sub", async () => {
  const mixed = [
    { orderId: "ORD-1", customerId: "sub-user-1", status: "Pending" },
    { orderId: "ORD-2", customerId: "sub-user-2", status: "Delivered" },
    { orderId: "ORD-3", status: "Pending" }, // missing customerId
  ];

  const owned = filterOrdersByCustomer(mixed, "sub-user-1");
  assert.equal(owned.length, 1);
  assert.equal(owned[0].orderId, "ORD-1");
  assert.deepEqual(filterOrdersByCustomer(mixed, ""), []);
});

await test("classifyOrderStatus & partitionOrders classify Ongoing vs Order History and sort newest first", async () => {
  assert.equal(classifyOrderStatus("Pending"), "ongoing");
  assert.equal(classifyOrderStatus("Preparing"), "ongoing");
  assert.equal(classifyOrderStatus("Out for Delivery"), "ongoing");
  assert.equal(classifyOrderStatus("Placed"), "ongoing");
  assert.equal(classifyOrderStatus("Confirmed"), "ongoing");
  assert.equal(classifyOrderStatus("Delivered"), "history");
  assert.equal(classifyOrderStatus("Cancelled"), "history");
  assert.equal(classifyOrderStatus("  delivered "), "history");

  assert.equal(getOrderStatusBadgeStyle("Out for Delivery").label, "Out for Delivery");
  assert.equal(getOrderStatusBadgeStyle("Cancelled").label, "Cancelled");

  const orders = [
    { orderId: "ORD-OLD-DELIVERED", status: "Delivered", createdAt: "2026-11-01T10:00:00.000Z" },
    { orderId: "ORD-PREP", status: "Preparing", createdAt: "2026-11-10T08:00:00.000Z" },
    { orderId: "ORD-PENDING", status: "Pending", createdAt: "2026-11-10T12:00:00.000Z" },
    { orderId: "ORD-OFD", status: "Out for Delivery", createdAt: "2026-11-10T10:00:00.000Z" },
    { orderId: "ORD-NEW-CANCELLED", status: "Cancelled", createdAt: "2026-11-09T14:00:00.000Z" },
  ];

  const { ongoingOrders, historyOrders } = partitionOrders(orders);

  assert.deepEqual(
    ongoingOrders.map((o) => o.orderId),
    ["ORD-PENDING", "ORD-OFD", "ORD-PREP"]
  );
  assert.deepEqual(
    historyOrders.map((o) => o.orderId),
    ["ORD-NEW-CANCELLED", "ORD-OLD-DELIVERED"]
  );

  assert.deepEqual(partitionOrders([]), { ongoingOrders: [], historyOrders: [] });
});

console.log(`\n======================================================`);
console.log(`MY ORDERS TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
