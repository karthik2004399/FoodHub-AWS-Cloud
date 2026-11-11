import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  extractCognitoGroups,
  resolveRoleFromGroups,
  validateLoginTabRole,
} from "../src/utils/authRoleValidation.js";
import { handler as adminHandler } from "../backend/admin.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

console.log("=== FOODHUB LOGIN ROLE & AUTOFILL VALIDATION TEST SUITE ===\n");

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

await test("Role matrix: Customer tab + customer group allows customer login", async () => {
  const res = validateLoginTabRole({
    groups: ["customer"],
    expectedRole: "customer",
  });
  assert.equal(res.allowed, true);
  assert.equal(res.role, "customer");
  assert.equal(res.error, "");
});

await test("Role matrix: Administrator tab + admin group allows admin login", async () => {
  const res = validateLoginTabRole({
    groups: ["admin"],
    expectedRole: "admin",
  });
  assert.equal(res.allowed, true);
  assert.equal(res.role, "admin");
  assert.equal(res.error, "");
});

await test("Role matrix: Administrator tab + customer group rejects with exact message", async () => {
  const res = validateLoginTabRole({
    groups: ["customer"],
    expectedRole: "admin",
  });
  assert.equal(res.allowed, false);
  assert.equal(res.role, null);
  assert.equal(res.error, "Access denied. Administrator account required.");
});

await test("Role matrix: Customer tab + admin group rejects with exact message", async () => {
  const res = validateLoginTabRole({
    groups: ["admin"],
    expectedRole: "customer",
  });
  assert.equal(res.allowed, false);
  assert.equal(res.role, null);
  assert.equal(res.error, "Access denied. Customer account required.");
});

await test("Role matrix: Self-registered customer without Cognito group allowed on Customer tab, rejected on Admin tab", async () => {
  const customerCheck = validateLoginTabRole({
    groups: [],
    expectedRole: "customer",
  });
  assert.equal(customerCheck.allowed, true);
  assert.equal(customerCheck.role, "customer");

  const adminCheck = validateLoginTabRole({
    groups: [],
    expectedRole: "admin",
  });
  assert.equal(adminCheck.allowed, false);
  assert.equal(adminCheck.error, "Access denied. Administrator account required.");
});

await test("extractCognitoGroups handles array, space-delimited, and bracketed Cognito group claims", async () => {
  assert.deepEqual(extractCognitoGroups({ "cognito:groups": ["admin"] }), ["admin"]);
  assert.deepEqual(extractCognitoGroups({ "cognito:groups": "[customer admin]" }), [
    "customer",
    "admin",
  ]);
  assert.deepEqual(extractCognitoGroups({ "cognito:groups": "customer, admin" }), [
    "customer",
    "admin",
  ]);
  assert.deepEqual(extractCognitoGroups({}), []);

  const unknownGroupCustomer = validateLoginTabRole({
    groups: ["vendor"],
    expectedRole: "customer",
  });
  assert.equal(unknownGroupCustomer.allowed, false);
  assert.equal(unknownGroupCustomer.error, "Access denied. Customer account required.");

  const dualRole = resolveRoleFromGroups(["customer", "admin"]);
  assert.equal(dualRole.isAdmin, true);
  assert.equal(dualRole.isCustomer, false);
  assert.equal(dualRole.role, "admin");
});

await test("Backend Admin API rejects customer Cognito claims with 403 and unauthenticated requests with 401", async () => {
  const customerAttempt = await adminHandler({
    httpMethod: "GET",
    path: "/admin/orders",
    requestContext: {
      authorizer: {
        jwt: {
          claims: {
            sub: "customer-sub-123",
            email: "customer@example.com",
            "cognito:groups": ["customer"],
          },
        },
      },
    },
  });
  assert.equal(customerAttempt.statusCode, 403);

  const anonymousAttempt = await adminHandler({
    httpMethod: "GET",
    path: "/admin/orders",
  });
  assert.equal(anonymousAttempt.statusCode, 401);
});

await test("Login.jsx uses Chrome-compatible autocomplete, initial readOnly unlock, and strict role enforcement", async () => {
  const loginSource = fs.readFileSync(
    path.join(rootDir, "src", "components", "Login.jsx"),
    "utf8"
  );

  assert.doesNotMatch(loginSource, /autoComplete=["']off["']/i);
  assert.match(loginSource, /autoComplete="on"/);
  assert.match(loginSource, /viewMode === "login" \? "username" : "email"/);
  assert.match(
    loginSource,
    /viewMode === "signup" \? "new-password" : "current-password"/
  );
  assert.match(loginSource, /autoComplete="new-password"/);
  assert.match(loginSource, /autoComplete="one-time-code"/);
  assert.match(loginSource, /readOnly=\{viewMode === "login" && !autofillUnlocked\}/);
  assert.match(loginSource, /unlockAutofill/);
  assert.match(loginSource, /expectedRole:\s*isAdminMode \? "admin" : "customer"/);
  assert.doesNotMatch(loginSource, /Logged in as customer/i);
});

await test("auth.js validates role before localStorage persistence and never stores passwords", async () => {
  const authSource = fs.readFileSync(
    path.join(rootDir, "src", "services", "auth.js"),
    "utf8"
  );
  const appSource = fs.readFileSync(
    path.join(rootDir, "src", "App.jsx"),
    "utf8"
  );

  const roleCheckIdx = authSource.indexOf("validateLoginTabRole");
  const setItemIdx = authSource.lastIndexOf("localStorage.setItem(STORAGE_KEY");
  assert.ok(roleCheckIdx !== -1, "auth.js must call validateLoginTabRole");
  assert.ok(setItemIdx !== -1, "auth.js must persist valid session");
  assert.ok(
    roleCheckIdx < setItemIdx,
    "auth.js must enforce login tab role before saving tokens to localStorage"
  );

  assert.doesNotMatch(authSource, /sessionStorage/);
  assert.doesNotMatch(authSource, /localStorage\.setItem[^;]*password/i);

  const loginSource = fs.readFileSync(
    path.join(rootDir, "src", "components", "Login.jsx"),
    "utf8"
  );
  assert.doesNotMatch(loginSource, /localStorage|sessionStorage/);

  assert.match(appSource, /if\s*\(\s*authService\.isAdmin\(\)\s*\)/);
  assert.doesNotMatch(appSource, /authenticatedUser\?\.role === "admin"/);
});

console.log(`\n=== SUMMARY: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}
