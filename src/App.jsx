import { useState } from "react"
import Navbar from "./components/navbar"
import Hero from "./components/Hero"
import Categories from "./components/Categories"
import Menu from "./components/Menu"
import Login from "./components/Login"
import Cart from "./components/Cart"
import Checkout from "./components/Checkout"

function App() {
  const [cart, setCart] = useState([])
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [showCart, setShowCart] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)

  const handleAddToCart = (food) => {
    setCart((currentCart) => {
      const existingItem = currentCart.find(
        (item) => item.id === food.id
      )

      if (existingItem) {
        return currentCart.map((item) =>
          item.id === food.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        )
      }

      return [
        ...currentCart,
        {
          ...food,
          quantity: 1,
        },
      ]
    })
  }

  const handleUpdateQuantity = (id, change) => {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === id
            ? {
                ...item,
                quantity: item.quantity + change,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    )
  }

  const handleRemoveItem = (id) => {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== id)
    )
  }

  const handleLogin = (userData) => {
    setUser(userData)
    setShowLogin(false)
  }

  const handlePlaceOrder = (order) => {
    const orderId = `ORD-${Date.now()}`

    console.log("Order:", {
      ...order,
      orderId,
      status: "Placed",
      createdAt: new Date().toISOString(),
    })

    alert(`Order placed successfully!\nOrder ID: ${orderId}`)

    setCart([])
    setShowCheckout(false)
  }

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  )

  return (
    <div className="min-h-screen bg-orange-50">

      <Navbar
        user={user}
        cartCount={cartCount}
        onLoginClick={() => setShowLogin(true)}
        onCartClick={() => setShowCart(true)}
      />

      {showLogin ? (
        <Login onLogin={handleLogin} />
      ) : showCheckout ? (
        <Checkout
          cart={cart}
          user={user}
          onPlaceOrder={handlePlaceOrder}
          onBack={() => setShowCheckout(false)}
        />
      ) : (
        <>
          <Hero />
          <Categories />
          <Menu onAddToCart={handleAddToCart} />
        </>
      )}

      {showCart && (
        <Cart
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClose={() => setShowCart(false)}
          onCheckout={() => {
            setShowCart(false)
            setShowCheckout(true)
          }}
        />
      )}

    </div>
  )
}

export default App