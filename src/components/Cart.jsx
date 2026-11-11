import {
  FALLBACK_FOOD_IMAGE,
  calculateOrderTotals,
  getCartItemId,
} from "../utils/orderSummary";

function Cart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClose,
  onCheckout,
}) {
  const { subtotal, deliveryFee, grandTotal, itemCount } =
    calculateOrderTotals(cart);

  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div className="absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Your Cart 🛒
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {itemCount} item(s)
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 px-3 py-2 text-gray-600 hover:bg-gray-200"
          >
            ✕
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="flex h-64 items-center justify-center px-6 text-center">
            <div>
              <div className="text-6xl">🛒</div>

              <h3 className="mt-4 text-xl font-bold text-gray-800">
                Your cart is empty
              </h3>

              <p className="mt-2 text-gray-500">
                Add some delicious food to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-5 p-6">
            {cart.map((item) => {
              const itemId = getCartItemId(item);
              return (
                <div
                  key={itemId}
                  className="flex gap-4 border-b border-gray-100 pb-5"
                >
                  <img
                    src={item.image || item.imageUrl || FALLBACK_FOOD_IMAGE}
                    alt={item.name}
                    className="h-20 w-20 rounded-xl object-cover"
                  />

                  <div className="flex-1">
                    <div className="flex justify-between gap-3">
                      <h3 className="font-bold text-gray-900">
                        {item.name}
                      </h3>

                      <button
                        type="button"
                        onClick={() => onRemoveItem(itemId)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    <p className="mt-1 font-semibold text-orange-600">
                      ₹{item.price}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(itemId, -1)}
                        className="h-8 w-8 rounded-full bg-gray-100 font-bold hover:bg-gray-200"
                      >
                        −
                      </button>

                      <span className="font-semibold">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => onUpdateQuantity(itemId, 1)}
                        className="h-8 w-8 rounded-full bg-orange-100 font-bold text-orange-600 hover:bg-orange-200"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {cart.length > 0 && (
          <div className="border-t bg-orange-50 p-6">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>₹{subtotal}</span>
            </div>

            <div className="mt-2 flex justify-between text-gray-600">
              <span>Delivery</span>
              <span>₹{deliveryFee}</span>
            </div>

            <div className="mt-4 flex justify-between border-t border-orange-200 pt-4 text-xl font-bold">
              <span>Total</span>

              <span className="text-orange-600">
                ₹{grandTotal}
              </span>
            </div>

            <button
              type="button"
              onClick={onCheckout}
              className="mt-6 w-full rounded-xl bg-orange-600 py-3 font-bold text-white hover:bg-orange-700"
            >
              Proceed to Checkout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Cart;
