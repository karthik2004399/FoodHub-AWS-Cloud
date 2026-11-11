import { useEffect, useState } from "react";
import { api } from "../services/api";
import {
  FALLBACK_FOOD_IMAGE,
  filterOrdersByCustomer,
  formatDeliveryAddress,
  formatIndianCurrency,
  formatOrderDateTime,
  getOrderStatusBadgeStyle,
  partitionOrders,
} from "../utils/orderSummary";

function OrderCard({ order }) {
  const badge = getOrderStatusBadgeStyle(order.status || "Pending");
  const deliveryAddress = formatDeliveryAddress(order.customer);
  const items = Array.isArray(order.items) ? order.items : [];
  const deliveryFee =
    order.deliveryFee !== undefined ? Number(order.deliveryFee) : 40;

  return (
    <article className="rounded-2xl bg-white p-6 shadow-sm border border-orange-100 transition hover:shadow-md">
      {/* Header Row: Order ID, Date, Status */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Order ID
            </span>
            <span className="font-mono text-sm font-bold text-orange-700">
              {order.orderId}
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Placed on {formatOrderDateTime(order.createdAt)}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${badge.bg} ${badge.text} ${badge.border}`}
        >
          <span>●</span>
          <span>{badge.label}</span>
        </span>
      </div>

      {/* Items List */}
      <div className="mt-4 space-y-3">
        {items.map((item, idx) => {
          const unitPrice = Number(item.price || 0);
          const quantity = Number(item.quantity || 0);
          const itemTotal =
            item.itemTotal !== undefined
              ? Number(item.itemTotal)
              : unitPrice * quantity;

          return (
            <div
              key={`${order.orderId}-item-${item.id || idx}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-orange-50/40 p-3 border border-orange-100/60"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <img
                  src={item.image || item.imageUrl || FALLBACK_FOOD_IMAGE}
                  alt={item.name || `Dish #${item.id}`}
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_FOOD_IMAGE;
                  }}
                  className="h-12 w-12 shrink-0 rounded-lg object-cover border border-gray-100"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 truncate">
                    {item.name || `Dish #${item.id}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatIndianCurrency(unitPrice)} × {quantity}
                  </p>
                </div>
              </div>

              <p className="shrink-0 font-bold text-sm text-gray-900">
                {formatIndianCurrency(itemTotal)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer Grid: Delivery Address & Price Breakdown */}
      <div className="mt-5 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
        <div className="text-xs text-gray-600 space-y-1">
          <p className="font-bold uppercase tracking-wider text-gray-400">
            Delivery Details
          </p>
          {order.customer?.name && (
            <p className="font-semibold text-gray-800">
              {order.customer.name}
              {order.customer.phone ? ` • ${order.customer.phone}` : ""}
            </p>
          )}
          <p>{deliveryAddress || "Address not specified"}</p>
          {order.paymentMethod && (
            <p className="pt-1 text-gray-500">
              Payment:{" "}
              <span className="font-semibold text-gray-800">
                {order.paymentMethod}
              </span>
            </p>
          )}
        </div>

        <div className="space-y-1.5 text-sm sm:border-l sm:border-gray-100 sm:pl-5">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span>
            <span>{formatIndianCurrency(order.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Delivery Fee</span>
            <span>{formatIndianCurrency(deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-bold text-gray-900">
            <span>Grand Total</span>
            <span className="text-orange-600">
              {formatIndianCurrency(order.total)}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function MyOrders({ user, onExploreMenu, onBack, onLoginClick }) {
  const userId = user?.id;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState("");

  const fetchOrders = async () => {
    if (!userId) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const response = await api.getMyOrders();
      const rawOrders = Array.isArray(response?.orders) ? response.orders : [];
      setOrders(filterOrdersByCustomer(rawOrders, userId));
    } catch (err) {
      console.error("Failed to fetch customer orders:", err);
      setError(
        err.message || "Unable to load your orders right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadInitialOrders() {
      if (!userId) {
        if (isMounted) {
          setOrders([]);
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setError("");
      }

      try {
        const response = await api.getMyOrders();
        if (!isMounted) return;
        const rawOrders = Array.isArray(response?.orders) ? response.orders : [];
        setOrders(filterOrdersByCustomer(rawOrders, userId));
      } catch (err) {
        if (!isMounted) return;
        console.error("Failed to load initial customer orders:", err);
        setError(
          err.message ||
            "Unable to load your orders right now. Please try again."
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadInitialOrders();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  if (!user) {
    return (
      <section className="min-h-screen bg-orange-50/60 px-6 py-16">
        <div className="mx-auto max-w-lg rounded-3xl bg-white p-10 text-center shadow-lg border border-orange-100">
          <div className="text-5xl">🔐</div>
          <h1 className="mt-4 text-2xl font-bold text-gray-900">
            Sign in to View Your Orders
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Log in with your FoodHub account to track active deliveries and browse past orders.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {onLoginClick && (
              <button
                type="button"
                onClick={onLoginClick}
                className="rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow hover:bg-orange-700 transition"
              >
                Login / Register
              </button>
            )}
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Back to Home
              </button>
            )}
          </div>
        </div>
      </section>
    );
  }

  const { ongoingOrders, historyOrders } = partitionOrders(orders);

  return (
    <section className="min-h-screen bg-orange-50/60 px-6 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="mb-3 text-sm font-semibold text-orange-600 hover:text-orange-700"
              >
                ← Back to Home
              </button>
            )}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              My Orders
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Track your live food deliveries and review past orders for{" "}
              <span className="font-semibold text-gray-700">{user.name}</span>.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={loading}
              onClick={fetchOrders}
              className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-xs font-bold text-orange-700 shadow-sm hover:bg-orange-50 transition disabled:opacity-60"
            >
              {loading ? "Refreshing..." : "🔄 Refresh Status"}
            </button>
            {onExploreMenu && (
              <button
                type="button"
                onClick={onExploreMenu}
                className="rounded-xl bg-orange-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-orange-700 transition"
              >
                + Order Food
              </button>
            )}
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="mt-10 rounded-2xl bg-white p-10 text-center shadow-sm border border-orange-100">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-200 border-t-orange-600" />
            <p className="mt-4 text-sm font-semibold text-gray-700">
              Loading your orders...
            </p>
          </div>
        )}

        {/* API Error State */}
        {!loading && error && (
          <div
            role="alert"
            className="mt-8 rounded-2xl bg-red-50 p-6 border border-red-200 flex flex-wrap items-center justify-between gap-4"
          >
            <div>
              <h2 className="text-sm font-bold text-red-800">
                Could not retrieve orders
              </h2>
              <p className="mt-1 text-xs text-red-700">{error}</p>
            </div>
            <button
              type="button"
              onClick={fetchOrders}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State (No orders at all) */}
        {!loading && !error && orders.length === 0 && (
          <div className="mt-10 rounded-3xl bg-white p-12 text-center shadow-sm border border-orange-100">
            <div className="text-6xl">🍽️</div>
            <h2 className="mt-4 text-2xl font-bold text-gray-900">
              No orders placed yet
            </h2>
            <p className="mt-2 text-sm text-gray-500 max-w-md mx-auto">
              Once you place an order, you can track real-time kitchen updates and review your order history right here.
            </p>
            {onExploreMenu && (
              <button
                type="button"
                onClick={onExploreMenu}
                className="mt-6 rounded-xl bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow hover:bg-orange-700 transition"
              >
                Explore Menu
              </button>
            )}
          </div>
        )}

        {/* Two Sections: Ongoing Orders + Order History */}
        {!loading && !error && orders.length > 0 && (
          <div className="mt-10 space-y-12">
            {/* Section 1: Ongoing Orders */}
            <section aria-labelledby="ongoing-orders-heading">
              <div className="flex items-center justify-between border-b border-orange-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">🛵</span>
                  <h2
                    id="ongoing-orders-heading"
                    className="text-2xl font-bold text-gray-900"
                  >
                    Ongoing Orders
                  </h2>
                </div>
                <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                  {ongoingOrders.length} active
                </span>
              </div>

              {ongoingOrders.length === 0 ? (
                <div className="mt-5 rounded-2xl bg-white p-8 text-center border border-gray-100 text-sm text-gray-500">
                  You have no active deliveries at the moment.
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  {ongoingOrders.map((order) => (
                    <OrderCard key={order.orderId} order={order} />
                  ))}
                </div>
              )}
            </section>

            {/* Section 2: Order History */}
            <section aria-labelledby="order-history-heading">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">📜</span>
                  <h2
                    id="order-history-heading"
                    className="text-2xl font-bold text-gray-900"
                  >
                    Order History
                  </h2>
                </div>
                <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-700">
                  {historyOrders.length} past
                </span>
              </div>

              {historyOrders.length === 0 ? (
                <div className="mt-5 rounded-2xl bg-white p-8 text-center border border-gray-100 text-sm text-gray-500">
                  Your delivered and cancelled orders will appear here.
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  {historyOrders.map((order) => (
                    <OrderCard key={order.orderId} order={order} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </section>
  );
}

export default MyOrders;
