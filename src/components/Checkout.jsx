import { useRef, useState } from "react";
import { api } from "../services/api";
import {
  FALLBACK_FOOD_IMAGE,
  PAYMENT_METHODS,
  calculateItemTotal,
  calculateOrderTotals,
  formatDeliveryAddress,
  formatIndianCurrency,
  formatOrderDateTime,
  getCartItemId,
  submitCheckoutOrder,
  validateCheckoutForm,
} from "../utils/orderSummary";

function extractTenDigitPhone(rawPhone = "") {
  const digits = String(rawPhone).replace(/^\+91/, "").replace(/\D/g, "");
  return digits.length === 10 ? digits : "";
}

function Checkout({
  cart = [],
  user,
  onUpdateQuantity,
  onRemoveItem,
  onPlaceOrder,
  onOrderMore,
  onViewOrders,
  onBack,
}) {
  const [address, setAddress] = useState({
    name: user?.name || "",
    phone: extractTenDigitPhone(user?.phone),
    address: "",
    city: "",
    pincode: "",
  });

  const [paymentMethod, setPaymentMethod] = useState(PAYMENT_METHODS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const isSubmittingRef = useRef(false);

  const { subtotal, deliveryFee, grandTotal, itemCount } =
    calculateOrderTotals(cart);

  const formattedAddressPreview = formatDeliveryAddress(address);
  const selectedPaymentOption =
    PAYMENT_METHODS.find((pm) => pm.id === paymentMethod) || PAYMENT_METHODS[0];

  const handleChange = (event) => {
    setAddress((prev) => ({
      ...prev,
      [event.target.name]: event.target.value,
    }));
    if (error) setError("");
  };

  const handlePaymentSelect = (methodId) => {
    setPaymentMethod(methodId);
    if (error) setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (isSubmittingRef.current || loading) {
      return;
    }

    setError("");

    const validation = validateCheckoutForm({ address, cart, paymentMethod });
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    isSubmittingRef.current = true;
    setLoading(true);

    try {
      const orderConfirmation = await submitCheckoutOrder({
        address,
        cart,
        paymentMethod,
        createOrderFn: (payload) => api.createOrder(payload),
      });

      setConfirmedOrder(orderConfirmation);

      if (onPlaceOrder) {
        onPlaceOrder(orderConfirmation);
      }
    } catch (err) {
      console.error("Order submission error:", err);
      setError(
        err.message ||
          "Unable to connect to the backend. Please try again."
      );
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  // Order Confirmation Screen (displayed strictly after backend confirms save)
  if (confirmedOrder) {
    const confirmedAddress = formatDeliveryAddress(confirmedOrder.customer);
    const confirmedPayment =
      confirmedOrder.paymentMethod || selectedPaymentOption.label;

    return (
      <section className="min-h-screen bg-orange-50 px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-3xl bg-white p-8 md:p-10 shadow-lg border border-orange-100">
            <div className="text-center border-b border-gray-100 pb-6">
              <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
                ✅
              </div>

              <h1 className="mt-4 text-3xl font-bold text-gray-900">
                Order Confirmed!
              </h1>

              <p className="mt-2 text-gray-500">
                Thank you for ordering with FoodHub. Your order has been saved and is being queued by our kitchen.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 text-xs font-bold text-amber-800 border border-amber-200">
                <span>●</span>
                <span>Order Status: {confirmedOrder.status || "Pending"}</span>
              </div>
            </div>

            {/* Order Metadata */}
            <div className="mt-6 grid gap-4 rounded-2xl bg-orange-50/70 p-5 border border-orange-100 sm:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Order ID
                </p>
                <p className="mt-1 font-mono text-base font-bold text-orange-700">
                  {confirmedOrder.orderId}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Order Date &amp; Time
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {formatOrderDateTime(confirmedOrder.createdAt)}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Delivery Address
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {confirmedOrder.customer?.name} ({confirmedOrder.customer?.phone})
                </p>
                <p className="text-xs text-gray-600">
                  {confirmedAddress}
                </p>
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Payment Method
                </p>
                <p className="mt-1 text-sm font-semibold text-gray-900">
                  {confirmedPayment}
                </p>
              </div>
            </div>

            {/* Ordered Items */}
            <div className="mt-8">
              <h2 className="text-lg font-bold text-gray-900">
                Ordered Food Items
              </h2>

              <div className="mt-4 space-y-4">
                {confirmedOrder.items?.map((item, idx) => {
                  const unitPrice = Number(item.price || 0);
                  const qty = Number(item.quantity || 0);
                  const itemTotal =
                    item.itemTotal !== undefined
                      ? Number(item.itemTotal)
                      : unitPrice * qty;

                  return (
                    <div
                      key={`${item.id || idx}-${idx}`}
                      className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <img
                          src={item.image || FALLBACK_FOOD_IMAGE}
                          alt={item.name}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_FOOD_IMAGE;
                          }}
                          className="h-14 w-14 rounded-xl object-cover border border-gray-100"
                        />
                        <div>
                          <p className="font-semibold text-gray-900">
                            {item.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {formatIndianCurrency(unitPrice)} × {qty}
                          </p>
                        </div>
                      </div>

                      <p className="font-bold text-gray-900">
                        {formatIndianCurrency(itemTotal)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Totals Breakdown */}
            <div className="mt-6 space-y-2.5 border-t border-gray-200 pt-6">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatIndianCurrency(confirmedOrder.subtotal)}</span>
              </div>

              <div className="flex justify-between text-sm text-gray-600">
                <span>Delivery Fee</span>
                <span>{formatIndianCurrency(confirmedOrder.deliveryFee)}</span>
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-3 text-xl font-bold text-gray-900">
                <span>Grand Total</span>
                <span className="text-orange-600">
                  {formatIndianCurrency(confirmedOrder.total)}
                </span>
              </div>
            </div>

            {/* Navigation Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {onViewOrders && (
                <button
                  type="button"
                  onClick={onViewOrders}
                  className="flex-1 rounded-xl bg-orange-600 py-3.5 text-center font-bold text-white shadow hover:bg-orange-700 transition"
                >
                  View My Orders
                </button>
              )}
              {onOrderMore && (
                <button
                  type="button"
                  onClick={onOrderMore}
                  className={`flex-1 rounded-xl py-3.5 text-center font-bold transition ${
                    onViewOrders
                      ? "border border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100"
                      : "bg-orange-600 text-white shadow hover:bg-orange-700"
                  }`}
                >
                  Order More Food
                </button>
              )}
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="flex-1 rounded-xl border border-gray-200 bg-white py-3.5 text-center font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  Back to Home
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-screen bg-orange-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-6 font-medium text-orange-600 hover:text-orange-700"
        >
          ← Back
        </button>

        <h1 className="text-4xl font-bold text-gray-900">
          Checkout
        </h1>

        <p className="mt-2 text-gray-500">
          Complete your delivery details and review your order summary.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Delivery Details & Payment Method */}
          <div className="rounded-2xl bg-white p-8 shadow-md">
            <h2 className="text-2xl font-bold text-gray-900">
              Delivery Details
            </h2>

            <form
              onSubmit={handleSubmit}
              className="mt-6 space-y-5"
            >
              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Full Name
                </label>

                <input
                  name="name"
                  value={address.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Phone Number
                </label>

                <input
                  name="phone"
                  type="tel"
                  value={address.phone}
                  onChange={handleChange}
                  required
                  maxLength={10}
                  inputMode="numeric"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
                  placeholder="10-digit phone number"
                />
              </div>

              <div>
                <label className="mb-2 block font-medium text-gray-700">
                  Address
                </label>

                <textarea
                  name="address"
                  value={address.address}
                  onChange={handleChange}
                  rows="3"
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
                  placeholder="House number, street, area"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block font-medium text-gray-700">
                    City
                  </label>

                  <input
                    name="city"
                    value={address.city}
                    onChange={handleChange}
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
                    placeholder="City"
                  />
                </div>

                <div>
                  <label className="mb-2 block font-medium text-gray-700">
                    Pincode
                  </label>

                  <input
                    name="pincode"
                    value={address.pincode}
                    onChange={handleChange}
                    required
                    maxLength={6}
                    inputMode="numeric"
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
                    placeholder="6-digit pincode"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="pt-2">
                <label className="mb-3 block font-bold text-gray-900">
                  Payment Method
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = paymentMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => handlePaymentSelect(method.id)}
                        className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${
                          isSelected
                            ? "border-orange-500 bg-orange-50/80 ring-1 ring-orange-500"
                            : "border-gray-200 bg-white hover:border-orange-300"
                        }`}
                      >
                        <span className="text-xl leading-none">{method.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-bold ${
                              isSelected ? "text-orange-700" : "text-gray-900"
                            }`}
                          >
                            {method.label}
                          </p>
                          <p className="text-xs text-gray-500">
                            {method.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm font-medium text-red-600 border border-red-200"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || cart.length === 0}
                className="w-full rounded-xl bg-orange-600 py-3.5 font-bold text-white shadow-md hover:bg-orange-700 transition disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? "Placing Order..."
                  : `Place Order (${formatIndianCurrency(grandTotal)})`}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="h-fit rounded-2xl bg-white p-8 shadow-md">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Order Summary
              </h2>
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                {itemCount} {itemCount === 1 ? "item" : "items"}
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="py-10 text-center">
                <div className="text-5xl">🛒</div>
                <h3 className="mt-3 text-lg font-bold text-gray-800">
                  Your cart is empty
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Add delicious dishes from our menu to place an order.
                </p>
                {onOrderMore && (
                  <button
                    type="button"
                    onClick={onOrderMore}
                    className="mt-4 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-700"
                  >
                    Explore Menu
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                {cart.map((item) => {
                  const itemId = getCartItemId(item);
                  const itemTotal = calculateItemTotal(item);

                  return (
                    <div
                      key={itemId}
                      className="flex items-center justify-between gap-4 border-b border-gray-100 pb-4"
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <img
                          src={item.image || item.imageUrl || FALLBACK_FOOD_IMAGE}
                          alt={item.name}
                          onError={(e) => {
                            e.currentTarget.src = FALLBACK_FOOD_IMAGE;
                          }}
                          className="h-16 w-16 shrink-0 rounded-xl object-cover border border-gray-100"
                        />

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900 truncate">
                            {item.name}
                          </p>

                          <p className="text-sm text-gray-500">
                            {formatIndianCurrency(item.price)} each × {item.quantity}
                          </p>

                          {onUpdateQuantity && (
                            <div className="mt-2 flex items-center gap-2">
                              <button
                                type="button"
                                disabled={loading}
                                aria-label={`Decrease quantity of ${item.name}`}
                                onClick={() => onUpdateQuantity(itemId, -1)}
                                className="h-7 w-7 rounded-full bg-gray-100 text-sm font-bold text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                              >
                                −
                              </button>
                              <span className="min-w-[1.25rem] text-center text-sm font-semibold text-gray-800">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={loading}
                                aria-label={`Increase quantity of ${item.name}`}
                                onClick={() => onUpdateQuantity(itemId, 1)}
                                className="h-7 w-7 rounded-full bg-orange-100 text-sm font-bold text-orange-600 hover:bg-orange-200 disabled:opacity-50"
                              >
                                +
                              </button>
                              {onRemoveItem && (
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={() => onRemoveItem(itemId)}
                                  className="ml-2 text-xs font-medium text-red-500 hover:text-red-700 disabled:opacity-50"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="shrink-0 font-bold text-gray-900">
                        {formatIndianCurrency(itemTotal)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Live Delivery Address & Payment Preview */}
            <div className="mt-6 space-y-3 rounded-xl bg-orange-50/60 p-4 border border-orange-100 text-sm">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Delivery Address
                </p>
                {address.name.trim() || formattedAddressPreview ? (
                  <div className="mt-1 text-gray-700">
                    {address.name.trim() && (
                      <p className="font-semibold text-gray-900">
                        {address.name.trim()}
                        {address.phone.trim() ? ` • ${address.phone.trim()}` : ""}
                      </p>
                    )}
                    <p className="text-xs text-gray-600">
                      {formattedAddressPreview || "Enter street address, city, and pincode"}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Enter your delivery details on the left to preview address.
                  </p>
                )}
              </div>

              <div className="border-t border-orange-100 pt-2.5 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                  Payment Method
                </span>
                <span className="font-semibold text-gray-900">
                  {selectedPaymentOption.icon} {selectedPaymentOption.label}
                </span>
              </div>
            </div>

            {/* Price Calculations */}
            <div className="mt-6 space-y-3 border-t border-gray-200 pt-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>{formatIndianCurrency(subtotal)}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Delivery Fee</span>
                <span>{formatIndianCurrency(deliveryFee)}</span>
              </div>

              <div className="flex justify-between border-t border-gray-200 pt-4 text-xl font-bold">
                <span>Grand Total</span>

                <span className="text-orange-600">
                  {formatIndianCurrency(grandTotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default Checkout;
