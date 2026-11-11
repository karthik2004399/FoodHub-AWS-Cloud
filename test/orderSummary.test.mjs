import assert from "node:assert/strict";
import { handler as orderHandler } from "../backend/order.mjs";
import {
  DELIVERY_FEE,
  PAYMENT_METHODS,
  buildOrderPayload,
  calculateItemTotal,
  calculateOrderTotals,
  formatDeliveryAddress,
  formatIndianCurrency,
  formatOrderDateTime,
  submitCheckoutOrder,
  updateCartItemsQuantity,
  validateCheckoutForm,
} from "../src/utils/orderSummary.js";

console.log("=== FOODHUB ORDER SUMMARY & CHECKOUT TEST SUITE ===\n");

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

const sampleCart = [
  {
    id: 1,
    name: "Margherita Pizza",
    price: 299,
    quantity: 2,
    image: "https://example.com/pizza.jpg",
  },
  {
    id: 2,
    name: "Classic Burger",
    price: 199,
    quantity: 1,
    image: "https://example.com/burger.jpg",
  },
];

const validAddress = {
  name: "Karthik Nair",
  phone: "9876543210",
  address: "42 MG Road, Andheri West",
  city: "Mumbai",
  pincode: "400053",
};

// ----------------------------------------------------------------------------
// 1. SUBTOTAL, ITEM TOTAL, AND GRAND TOTAL CALCULATIONS
// ----------------------------------------------------------------------------
await test("Calculates item totals, subtotal, ₹40 delivery fee, and grand total accurately", async () => {
  assert.equal(calculateItemTotal(sampleCart[0]), 598);
  assert.equal(calculateItemTotal(sampleCart[1]), 199);

  const totals = calculateOrderTotals(sampleCart);
  assert.equal(totals.itemCount, 3);
  assert.equal(totals.subtotal, 797);
  assert.equal(totals.deliveryFee, DELIVERY_FEE);
  assert.equal(totals.grandTotal, 837);
  assert.equal(formatIndianCurrency(totals.grandTotal), "₹837");
});

// ----------------------------------------------------------------------------
// 2. QUANTITY CHANGES UPDATE CALCULATIONS AUTOMATICALLY
// ----------------------------------------------------------------------------
await test("Quantity increment, decrement, and removal automatically update subtotal and grand total", async () => {
  // Increase burger qty from 1 -> 3
  const increasedCart = updateCartItemsQuantity(sampleCart, 2, 2);
  const incTotals = calculateOrderTotals(increasedCart);
  assert.equal(increasedCart[1].quantity, 3);
  assert.equal(incTotals.itemCount, 5);
  assert.equal(incTotals.subtotal, 299 * 2 + 199 * 3); // 598 + 597 = 1195
  assert.equal(incTotals.grandTotal, 1195 + 40);

  // Decrease pizza qty to 0 -> item removed cleanly
  const reducedCart = updateCartItemsQuantity(increasedCart, 1, -2);
  assert.equal(reducedCart.length, 1);
  assert.equal(reducedCart[0].id, 2);
  const redTotals = calculateOrderTotals(reducedCart);
  assert.equal(redTotals.subtotal, 597);
  assert.equal(redTotals.deliveryFee, 40);
  assert.equal(redTotals.grandTotal, 637);
});

// ----------------------------------------------------------------------------
// 3. EMPTY CART HANDLING
// ----------------------------------------------------------------------------
await test("Empty cart yields zero subtotal, zero delivery fee, zero grand total, and fails checkout validation", async () => {
  const emptyTotals = calculateOrderTotals([]);
  assert.deepEqual(emptyTotals, {
    subtotal: 0,
    deliveryFee: 0,
    grandTotal: 0,
    itemCount: 0,
  });

  const validation = validateCheckoutForm({
    address: validAddress,
    cart: [],
    paymentMethod: PAYMENT_METHODS[0].id,
  });
  assert.equal(validation.valid, false);
  assert.match(validation.error, /cart is empty/i);
});

// ----------------------------------------------------------------------------
// 4. CHECKOUT FIELD VALIDATIONS
// ----------------------------------------------------------------------------
await test("Rejects missing delivery fields, invalid phone, invalid pincode, and invalid payment method", async () => {
  const missingCity = validateCheckoutForm({
    address: { ...validAddress, city: "  " },
    cart: sampleCart,
    paymentMethod: "UPI",
  });
  assert.equal(missingCity.valid, false);
  assert.match(missingCity.error, /all delivery details/i);

  const badPhone = validateCheckoutForm({
    address: { ...validAddress, phone: "98765" },
    cart: sampleCart,
    paymentMethod: "UPI",
  });
  assert.equal(badPhone.valid, false);
  assert.match(badPhone.error, /10-digit phone/i);

  const badPincode = validateCheckoutForm({
    address: { ...validAddress, pincode: "4000" },
    cart: sampleCart,
    paymentMethod: "UPI",
  });
  assert.equal(badPincode.valid, false);
  assert.match(badPincode.error, /6-digit pincode/i);

  const badPayment = validateCheckoutForm({
    address: validAddress,
    cart: sampleCart,
    paymentMethod: "UnknownMethod",
  });
  assert.equal(badPayment.valid, false);
  assert.match(badPayment.error, /payment method/i);

  const ok = validateCheckoutForm({
    address: validAddress,
    cart: sampleCart,
    paymentMethod: "UPI",
  });
  assert.equal(ok.valid, true);
});

// ----------------------------------------------------------------------------
// 5. PAYLOAD SANITIZATION (NO CLIENT PRICES SENT)
// ----------------------------------------------------------------------------
await test("buildOrderPayload omits client prices and preserves numeric & string item IDs", async () => {
  const payload = buildOrderPayload({
    address: validAddress,
    cart: [
      { id: 1, quantity: 2, price: 299 },
      { id: "ITEM-999", itemId: "ITEM-999", quantity: 1, price: 350 },
    ],
    paymentMethod: "Cash on Delivery",
  });

  assert.equal(payload.subtotal, undefined);
  assert.equal(payload.total, undefined);
  assert.equal(payload.items[0].price, undefined);
  assert.equal(payload.items[0].id, 1);
  assert.equal(payload.items[1].id, "ITEM-999");
  assert.equal(payload.paymentMethod, "Cash on Delivery");
});

// ----------------------------------------------------------------------------
// 6. END-TO-END ORDER CREATION & CONFIRMATION (CONNECTED WITH order.mjs)
// ----------------------------------------------------------------------------
await test("Successful order creation returns Order ID, timestamp, items, quantities, grand total, and status 'Pending'", async () => {
  let cartCleared = false;

  const confirmation = await submitCheckoutOrder({
    address: validAddress,
    cart: sampleCart,
    paymentMethod: "UPI",
    createOrderFn: async (payload) => {
      const lambdaRes = await orderHandler({
        httpMethod: "POST",
        body: JSON.stringify(payload),
      });
      return JSON.parse(lambdaRes.body);
    },
  });

  // Parent callback clears cart ONLY after confirmation succeeds
  if (confirmation?.orderId) {
    cartCleared = true;
  }

  assert.equal(cartCleared, true);
  assert.ok(confirmation.orderId.startsWith("ORD-"));
  assert.equal(confirmation.status, "Pending");
  assert.equal(confirmation.paymentMethod, "UPI");
  assert.equal(confirmation.subtotal, 797);
  assert.equal(confirmation.deliveryFee, 40);
  assert.equal(confirmation.total, 837);
  assert.equal(confirmation.items.length, 2);
  assert.equal(confirmation.items[0].name, "Margherita Pizza");
  assert.equal(confirmation.items[0].quantity, 2);
  assert.equal(confirmation.items[0].itemTotal, 598);
  assert.ok(formatOrderDateTime(confirmation.createdAt).length > 4);
  assert.equal(
    formatDeliveryAddress(confirmation.customer),
    "42 MG Road, Andheri West, Mumbai - 400053"
  );
});

// ----------------------------------------------------------------------------
// 7. BACKEND FAILURE HANDLING (CART MUST NOT CLEAR, NO CONFIRMATION SHOWN)
// ----------------------------------------------------------------------------
await test("Backend failure preserves cart and throws error without confirmation", async () => {
  let activeCart = [...sampleCart];
  let confirmedOrder = null;

  await assert.rejects(
    async () => {
      confirmedOrder = await submitCheckoutOrder({
        address: validAddress,
        cart: activeCart,
        paymentMethod: "Credit / Debit Card",
        createOrderFn: async () => {
          throw new Error("Database error: unable to save order. Please try again.");
        },
      });
      activeCart = [];
    },
    /unable to save order/i
  );

  assert.equal(confirmedOrder, null);
  assert.equal(activeCart.length, 2);

  // Also reject incomplete responses missing orderId
  await assert.rejects(
    async () => {
      await submitCheckoutOrder({
        address: validAddress,
        cart: activeCart,
        paymentMethod: "Cash on Delivery",
        createOrderFn: async () => ({ success: true, order: {} }),
      });
    },
    /Unable to confirm order creation/i
  );
});

console.log(`\n======================================================`);
console.log(`ORDER SUMMARY TEST RESULTS: ${passed} passed, ${failed} failed`);
console.log(`======================================================\n`);

if (failed > 0) {
  process.exit(1);
}
