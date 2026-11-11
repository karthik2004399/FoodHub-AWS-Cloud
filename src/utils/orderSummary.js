// Shared order summary, checkout validation, and confirmation helpers for FoodHub

export const DELIVERY_FEE = 40;

export const FALLBACK_FOOD_IMAGE =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";

export const PAYMENT_METHODS = [
  {
    id: "Cash on Delivery",
    label: "Cash on Delivery",
    description: "Pay with cash or UPI upon delivery",
    icon: "💵",
  },
  {
    id: "UPI",
    label: "UPI",
    description: "GPay, PhonePe, Paytm, BHIM",
    icon: "📱",
  },
  {
    id: "Credit / Debit Card",
    label: "Credit / Debit Card",
    description: "Visa, Mastercard, RuPay",
    icon: "💳",
  },
  {
    id: "Net Banking",
    label: "Net Banking",
    description: "All major Indian banks",
    icon: "🏦",
  },
];

export function getCartItemId(item) {
  return item?.id ?? item?.itemId;
}

export function calculateItemTotal(item) {
  const unitPrice = Math.max(0, Number(item?.price) || 0);
  const quantity = Math.max(0, Number(item?.quantity) || 0);
  return unitPrice * quantity;
}

export function calculateOrderTotals(cart = []) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return {
      subtotal: 0,
      deliveryFee: 0,
      grandTotal: 0,
      itemCount: 0,
    };
  }

  let subtotal = 0;
  let itemCount = 0;

  for (const item of cart) {
    const qty = Math.max(0, Number(item?.quantity) || 0);
    if (qty > 0) {
      subtotal += calculateItemTotal(item);
      itemCount += qty;
    }
  }

  const deliveryFee = itemCount > 0 ? DELIVERY_FEE : 0;
  const grandTotal = subtotal + deliveryFee;

  return {
    subtotal,
    deliveryFee,
    grandTotal,
    itemCount,
  };
}

export function updateCartItemsQuantity(cart = [], targetId, change) {
  if (!Array.isArray(cart)) return [];
  return cart
    .map((item) =>
      getCartItemId(item) === targetId
        ? {
            ...item,
            quantity: Number(item.quantity || 0) + Number(change || 0),
          }
        : item
    )
    .filter((item) => item.quantity > 0);
}

export function validateCheckoutForm({ address = {}, cart = [], paymentMethod = "" }) {
  if (!Array.isArray(cart) || cart.length === 0) {
    return {
      valid: false,
      error: "Your cart is empty. Please add at least one item before placing an order.",
    };
  }

  const hasValidItems = cart.some(
    (item) => getCartItemId(item) !== undefined && Number(item.quantity) > 0
  );
  if (!hasValidItems) {
    return {
      valid: false,
      error: "Your cart has no valid item quantities.",
    };
  }

  if (
    !address.name?.trim() ||
    !address.phone?.trim() ||
    !address.address?.trim() ||
    !address.city?.trim() ||
    !address.pincode?.trim()
  ) {
    return {
      valid: false,
      error: "Please fill in all delivery details.",
    };
  }

  if (!/^\d{10}$/.test(address.phone.trim())) {
    return {
      valid: false,
      error: "Please enter a valid 10-digit phone number.",
    };
  }

  if (!/^\d{6}$/.test(address.pincode.trim())) {
    return {
      valid: false,
      error: "Please enter a valid 6-digit pincode.",
    };
  }

  const validPaymentIds = PAYMENT_METHODS.map((pm) => pm.id);
  if (!paymentMethod || !validPaymentIds.includes(paymentMethod)) {
    return {
      valid: false,
      error: "Please select a valid payment method.",
    };
  }

  return { valid: true, error: "" };
}

/**
 * Constructs the API payload for POST /orders.
 * Never includes client-calculated prices, subtotals, or totals so the backend
 * always computes authoritative pricing from FoodHubMenu.
 */
export function buildOrderPayload({ address, cart, paymentMethod }) {
  return {
    customer: {
      name: address.name.trim(),
      phone: address.phone.trim(),
      address: address.address.trim(),
      city: address.city.trim(),
      pincode: address.pincode.trim(),
    },
    paymentMethod,
    items: cart.map((item) => {
      const rawId = item.itemId ?? item.id;
      const numericId = Number(rawId);
      return {
        id:
          Number.isFinite(numericId) && String(numericId) === String(rawId)
            ? numericId
            : String(rawId),
        quantity: Number(item.quantity),
      };
    }),
  };
}

export function formatIndianCurrency(amount) {
  return `₹${Number(amount || 0)}`;
}

export function formatOrderDateTime(isoString) {
  if (!isoString) return "Just now";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Just now";
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  } catch {
    return date.toLocaleString();
  }
}

export function formatDeliveryAddress(customer = {}) {
  const street = customer.address?.trim() || "";
  const city = customer.city?.trim() || "";
  const pincode = customer.pincode?.trim() || "";
  const cityPin = [city, pincode ? `- ${pincode}` : ""].filter(Boolean).join(" ");
  return [street, cityPin].filter(Boolean).join(", ");
}

/**
 * Validates checkout inputs, calls the backend order endpoint, and verifies that
 * an authoritative orderId was persisted before returning confirmation data.
 */
export async function submitCheckoutOrder({
  address,
  cart,
  paymentMethod,
  createOrderFn,
}) {
  const validation = validateCheckoutForm({ address, cart, paymentMethod });
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  if (typeof createOrderFn !== "function") {
    throw new Error("Order API handler is unavailable.");
  }

  const payload = buildOrderPayload({ address, cart, paymentMethod });
  const result = await createOrderFn(payload);

  if (!result || !result.success || !result.order || !result.order.orderId) {
    throw new Error(
      result?.message || "Unable to confirm order creation from backend."
    );
  }

  // Build image lookup map from cart purely for UI display in confirmation receipt
  const imageById = new Map();
  for (const cartItem of cart) {
    const key = String(getCartItemId(cartItem));
    const img = cartItem.image || cartItem.imageUrl;
    if (img) imageById.set(key, img);
  }

  const confirmedOrder = result.order;
  const enrichedItems = Array.isArray(confirmedOrder.items)
    ? confirmedOrder.items.map((item) => ({
        ...item,
        image:
          item.image ||
          item.imageUrl ||
          imageById.get(String(item.id ?? item.itemId)) ||
          FALLBACK_FOOD_IMAGE,
        itemTotal:
          item.itemTotal !== undefined
            ? Number(item.itemTotal)
            : Number(item.price || 0) * Number(item.quantity || 0),
      }))
    : [];

  return {
    ...confirmedOrder,
    items: enrichedItems,
    status: confirmedOrder.status || "Pending",
    paymentMethod: confirmedOrder.paymentMethod || paymentMethod,
  };
}

export const ONGOING_ORDER_STATUSES = [
  "Pending",
  "Placed",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
];

export const ORDER_HISTORY_STATUSES = ["Delivered", "Cancelled"];

/**
 * Classifies an order status into either "ongoing" (Pending, Preparing,
 * Out for Delivery, Placed, Confirmed) or "history" (Delivered, Cancelled).
 */
export function classifyOrderStatus(status = "") {
  const normalized = String(status).trim().toLowerCase();
  if (normalized === "delivered" || normalized === "cancelled") {
    return "history";
  }
  return "ongoing";
}

/**
 * Filters orders to only those owned by customerId when customerId is provided
 * on the order record, providing defensive client-side verification.
 */
export function filterOrdersByCustomer(orders = [], customerId) {
  if (!Array.isArray(orders) || !customerId) return [];
  return orders.filter(
    (order) => order && order.customerId === String(customerId)
  );
}

/**
 * Sorts orders newest-first by createdAt and partitions them into
 * Ongoing Orders and Order History.
 */
export function partitionOrders(orders = []) {
  if (!Array.isArray(orders)) {
    return { ongoingOrders: [], historyOrders: [] };
  }

  const sorted = [...orders].sort((a, b) => {
    const timeA = new Date(a?.createdAt || 0).getTime();
    const timeB = new Date(b?.createdAt || 0).getTime();
    return timeB - timeA;
  });

  const ongoingOrders = [];
  const historyOrders = [];

  for (const order of sorted) {
    if (classifyOrderStatus(order?.status) === "history") {
      historyOrders.push(order);
    } else {
      ongoingOrders.push(order);
    }
  }

  return { ongoingOrders, historyOrders };
}

export function getOrderStatusBadgeStyle(status = "Pending") {
  const normalized = String(status).trim().toLowerCase();
  if (normalized === "delivered") {
    return {
      bg: "bg-green-100",
      text: "text-green-800",
      border: "border-green-200",
      label: "Delivered",
    };
  }
  if (normalized === "cancelled") {
    return {
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-200",
      label: "Cancelled",
    };
  }
  if (normalized === "out for delivery") {
    return {
      bg: "bg-blue-100",
      text: "text-blue-800",
      border: "border-blue-200",
      label: "Out for Delivery",
    };
  }
  if (normalized === "preparing") {
    return {
      bg: "bg-orange-100",
      text: "text-orange-800",
      border: "border-orange-200",
      label: "Preparing",
    };
  }
  return {
    bg: "bg-amber-100",
    text: "text-amber-800",
    border: "border-amber-200",
    label: status || "Pending",
  };
}
