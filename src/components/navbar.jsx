function Navbar({
  user,
  cartCount,
  onLoginClick,
  onCartClick,
  onHomeClick,
  onLogout,
}) {
  const handleNavHome = (e) => {
    e.preventDefault()
    if (onHomeClick) onHomeClick()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleNavMenu = (e) => {
    e.preventDefault()
    if (onHomeClick) onHomeClick()
    const menuEl = document.getElementById("menu")
    if (menuEl) {
      menuEl.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* Logo */}
        <button
          type="button"
          onClick={handleNavHome}
          className="flex items-center gap-2 text-left"
        >
          <span className="text-3xl">🍽️</span>

          <h1 className="text-2xl font-bold text-orange-600">
            FoodHub
          </h1>
        </button>

        {/* Navigation */}
        <div className="hidden items-center gap-8 md:flex">
          <button
            type="button"
            onClick={handleNavHome}
            className="font-medium text-orange-600 hover:text-orange-700"
          >
            Home
          </button>

          <button
            type="button"
            onClick={handleNavMenu}
            className="font-medium text-gray-600 hover:text-orange-600"
          >
            Menu
          </button>

          <a
            href="#about"
            onClick={(e) => {
              e.preventDefault()
              if (onHomeClick) onHomeClick()
            }}
            className="font-medium text-gray-600 hover:text-orange-600"
          >
            About
          </a>

          <a
            href="#contact"
            onClick={(e) => {
              e.preventDefault()
              if (onHomeClick) onHomeClick()
            }}
            className="font-medium text-gray-600 hover:text-orange-600"
          >
            Contact
          </a>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">

          {user ? (
            <div className="flex items-center gap-2">
              <div className="rounded-full bg-green-100 px-4 py-2 font-medium text-green-700">
                👤 {user.name}
              </div>
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Logout"
                  className="rounded-full border border-gray-200 px-3 py-2 text-xs text-gray-600 hover:bg-gray-100"
                >
                  Logout
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onLoginClick}
              className="rounded-full border border-orange-600 px-4 py-2 font-semibold text-orange-600 hover:bg-orange-50"
            >
              🔐 Login
            </button>
          )}

          <button
            type="button"
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
