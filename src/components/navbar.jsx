function Navbar({
  user,
  cartCount,
  onLoginClick,
  onCartClick,
}) {
  return (
    <nav className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-3xl">🍽️</span>

          <h1 className="text-2xl font-bold text-orange-600">
            FoodHub
          </h1>
        </div>

        {/* Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#"
            className="font-medium text-orange-600"
          >
            Home
          </a>

          <a
            href="#menu"
            className="font-medium text-gray-600 hover:text-orange-600"
          >
            Menu
          </a>

          <a
            href="#about"
            className="font-medium text-gray-600 hover:text-orange-600"
          >
            About
          </a>

          <a
            href="#contact"
            className="font-medium text-gray-600 hover:text-orange-600"
          >
            Contact
          </a>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">

          {user ? (
            <div className="rounded-full bg-green-100 px-4 py-2 font-medium text-green-700">
              👤 {user.name}
            </div>
          ) : (
            <button
              onClick={onLoginClick}
              className="rounded-full border border-orange-600 px-4 py-2 font-semibold text-orange-600 hover:bg-orange-50"
            >
              🔐 Login
            </button>
          )}

          <button
            onClick={onCartClick}
            className="relative rounded-full bg-orange-100 px-4 py-2 font-semibold text-orange-600 hover:bg-orange-200"
          >
            🛒 Cart

            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-orange-600 text-xs font-bold text-white">
                {cartCount}
              </span>
            )}
          </button>

        </div>
      </div>
    </nav>
  )
}

export default Navbar