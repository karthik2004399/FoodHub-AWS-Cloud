import { useState } from "react"

function Checkout({
  cart,
  user,
  onPlaceOrder,
  onBack,
}) {
  const [address, setAddress] = useState({
    name: user?.name || "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const subtotal = cart.reduce(
    (total, item) =>
      total + item.price * item.quantity,
    0
  )

  const deliveryFee = 40
  const total = subtotal + deliveryFee

  const handleChange = (event) => {
    setAddress({
      ...address,
      [event.target.name]: event.target.value,
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError("")

    if (
      !address.name.trim() ||
      !address.phone.trim() ||
      !address.address.trim() ||
      !address.city.trim() ||
      !address.pincode.trim()
    ) {
      setError("Please fill in all delivery details.")
      return
    }

    if (!/^\d{10}$/.test(address.phone.trim())) {
      setError("Please enter a valid 10-digit phone number.")
      return
    }

    if (!/^\d{6}$/.test(address.pincode.trim())) {
      setError("Please enter a valid 6-digit pincode.")
      return
    }

    if (cart.length === 0) {
      setError("Your cart is empty.")
      return
    }

    setLoading(true)

    try {
      const response = await fetch(
        "https://p58iopju3f.execute-api.ap-south-1.amazonaws.com/orders",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            customer: address,
            items: cart.map((item) => ({
              id: Number(item.id),
              quantity: Number(item.quantity),
            })),
          }),
        }
      )

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Unable to place your order."
        )
      }

      alert(
        `Order placed successfully!\n\nOrder ID: ${result.order.orderId}\nTotal: ₹${result.order.total}`
      )

      if (onPlaceOrder) {
        onPlaceOrder(result.order)
      }
    } catch (err) {
      console.error("Order submission error:", err)

      setError(
        err.message ||
          "Unable to connect to the backend. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-screen bg-orange-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <button
          onClick={onBack}
          className="mb-6 font-medium text-orange-600 hover:text-orange-700"
        >
          ← Back
        </button>

        <h1 className="text-4xl font-bold text-gray-900">
          Checkout
        </h1>

        <p className="mt-2 text-gray-500">
          Complete your details to place the order.
        </p>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          {/* Delivery Details */}
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

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 p-3 text-sm text-red-600"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || cart.length === 0}
                className="w-full rounded-xl bg-orange-600 py-3 font-bold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Placing Order..." : "Place Order"}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="h-fit rounded-2xl bg-white p-8 shadow-md">
            <h2 className="text-2xl font-bold text-gray-900">
              Order Summary
            </h2>

            <div className="mt-6 space-y-5">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between border-b border-gray-100 pb-4"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {item.name}
                    </p>

                    <p className="text-sm text-gray-500">
                      ₹{item.price} × {item.quantity}
                    </p>
                  </div>

                  <p className="font-semibold text-gray-900">
                    ₹{item.price * item.quantity}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3 border-t pt-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{subtotal}</span>
              </div>

              <div className="flex justify-between text-gray-600">
                <span>Delivery</span>
                <span>₹{deliveryFee}</span>
              </div>

              <div className="flex justify-between border-t pt-4 text-xl font-bold">
                <span>Total</span>

                <span className="text-orange-600">
                  ₹{total}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Checkout