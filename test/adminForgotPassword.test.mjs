import assert from "node:assert/strict";
import {
  validateAdminPasswordResetForm,
  validateAdminResetEmail,
} from "../src/utils/adminPasswordReset.js";

console.log("=== FOODHUB ADMIN FORGOT PASSWORD TEST SUITE ===\n");

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

await test("validateAdminResetEmail rejects empty and invalid emails", async () => {
  const emptyCheck = validateAdminResetEmail("   ");
  assert.equal(emptyCheck.valid, false);
  assert.match(emptyCheck.error, /administrator email/i);

  const malformedCheck = validateAdminResetEmail("invalid-email");
  assert.equal(malformedCheck.valid, false);
  assert.match(malformedCheck.error, /valid email/i);
});

await test("validateAdminResetEmail accepts and trims valid admin email", async () => {
  const validCheck = validateAdminResetEmail("  admin@foodhub.com  ");
  assert.equal(validCheck.valid, true);
  assert.equal(validCheck.email, "admin@foodhub.com");
  assert.equal(validCheck.error, "");
});

await test("validateAdminPasswordResetForm rejects missing code, short password, and mismatched confirm password", async () => {
  const missingCode = validateAdminPasswordResetForm({
    email: "admin@foodhub.com",
    code: "12",
    newPassword: "NewPassword@123",
    confirmNewPassword: "NewPassword@123",
  });
  assert.equal(missingCode.valid, false);
  assert.match(missingCode.error, /verification code/i);

  const shortPass = validateAdminPasswordResetForm({
    email: "admin@foodhub.com",
    code: "123456",
    newPassword: "Short1!",
    confirmNewPassword: "Short1!",
  });
  assert.equal(shortPass.valid, false);
  assert.match(shortPass.error, /at least 8 characters/i);

  const mismatchPass = validateAdminPasswordResetForm({
    email: "admin@foodhub.com",
    code: "123456",
    newPassword: "NewPassword@123",
    confirmNewPassword: "DifferentPassword@123",
  });
  assert.equal(mismatchPass.valid, false);
  assert.match(mismatchPass.error, /do not match/i);
});

await test("validateAdminPasswordResetForm accepts valid verification code and matching strong password", async () => {
  const valid = validateAdminPasswordResetForm({
    email: "admin@foodhub.com",
    code: " 654321 ",
    newPassword: "NewAdminPass@2026",
    confirmNewPassword: "NewAdminPass@2026",
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.error, "");
});

console.log(`\n======================================================`);
console.log(`ADMIN FORGOT PASSWORD TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
