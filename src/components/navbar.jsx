import { useState } from "react";
import { authService } from "../services/auth";

function Navbar({
  user,
  cartCount = 0,
  currentView = "home",
  onNavigate,
  onLoginClick,
  onCartClick,
  onLogout,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view, e) => {
    if (e) e.preventDefault();
    setMobileMenuOpen(false);
    if (onNavigate) {
      onNavigate(view);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const navLinks = [
    { id: "home", label: "Home" },
    { id: "menu", label: "Menu" },
    { id: "my-orders", label: "My Orders" },
    { id: "about", label: "About Us" },
    { id: "contact", label: "Contact Us" },
  ];

  const isAdmin = authService.isAdmin() || user?.role === "admin";

  return (
    <nav className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3.5">
        {/* Brand / Logo */}
        <button
          type="button"
          onClick={(e) => handleNav("home", e)}
          className="flex items-center gap-2 text-left"
        >
          <span className="text-3xl">🍽️</span>
          <div>
            <h1 className="text-2xl font-black text-orange-600 tracking-tight">
              FoodHub
            </h1>
            <p className="hidden text-[10px] font-semibold text-orange-700 tracking-wider sm:block">
              FRESH BITES, HAPPY MOMENTS.
            </p>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => {
            const isActive = currentView === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={(e) => handleNav(link.id, e)}
                className={`text-sm font-semibold transition ${
                  isActive
                    ? "text-orange-600 border-b-2 border-orange-600 pb-0.5"
                    : "text-gray-600 hover:text-orange-600"
                }`}
              >
                {link.label}
              </button>
            );
          })}

          {/* Admin Dashboard Quick Link for Admins */}
          {isAdmin && (
            <button
              type="button"
              onClick={(e) => handleNav("admin", e)}
              className={`rounded-full px-3 py-1 text-xs font-bold transition flex items-center gap-1.5 ${
                currentView === "admin"
                  ? "bg-purple-700 text-white shadow-sm"
                  : "bg-purple-100 text-purple-700 hover:bg-purple-200"
              }`}
            >
              🛡️ Admin Dashboard
            </button>
          )}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2.5">
          {/* User Account Area / Login */}
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full bg-orange-100/70 border border-orange-200 px-3.5 py-1.5 text-xs font-bold text-orange-800">
                <span>{isAdmin ? "🛡️" : "👤"}</span>
                <span className="max-w-[120px] truncate">{user.name}</span>
                {isAdmin && (
                  <span className="rounded bg-purple-600 px-1.5 py-0.2 text-[10px] text-white">
                    Admin
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={(e) => handleNav("my-orders", e)}
                title="View your ongoing orders and order history"
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  currentView === "my-orders"
                    ? "border-orange-600 bg-orange-600 text-white"
                    : "border-orange-200 bg-white text-orange-700 hover:bg-orange-50"
                }`}
              >
                📦 My Orders
              </button>

              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  title="Sign out of account"
                  className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                >
                  Logout
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={onLoginClick}
              className="rounded-full border border-orange-600 px-4 py-1.5 text-xs font-bold text-orange-600 transition hover:bg-orange-50"
            >
              🔐 Login
            </button>
          )}

          {/* Cart Trigger */}
          <button
            type="button"
            onClick={onCartClick}
            className="relative flex items-center gap-1.5 rounded-full bg-orange-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-orange-700 transition"
          >
            <span>🛒</span>
            <span className="hidden sm:inline">Cart</span>
            {cartCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] font-black text-orange-600 shadow-sm">
                {cartCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl border border-gray-200 p-2 text-gray-600 md:hidden hover:bg-gray-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="border-t border-orange-100 bg-white px-6 py-4 md:hidden space-y-3 shadow-lg">
          <div className="flex flex-col space-y-2">
            {navLinks.map((link) => (
              <button
                key={link.id}
                type="button"
                onClick={(e) => handleNav(link.id, e)}
                className={`text-left py-2 text-sm font-semibold ${
                  currentView === link.id
                    ? "text-orange-600 font-bold"
                    : "text-gray-700"
                }`}
              >
                {link.label}
              </button>
            ))}

            {isAdmin && (
              <button
                type="button"
                onClick={(e) => handleNav("admin", e)}
                className="text-left py-2 text-sm font-bold text-purple-700 flex items-center gap-2"
              >
                🛡️ Admin Dashboard
              </button>
            )}
          </div>

          {user && (
            <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-bold text-gray-700">
                Logged in as <span className="text-orange-600">{user.name}</span>
                {isAdmin && " (Admin)"}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => handleNav("my-orders", e)}
                  className="rounded-lg bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700"
                >
                  📦 My Orders
                </button>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="rounded-lg bg-red-50 px-3 py-1 text-xs font-bold text-red-600"
                  >
                    Logout
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

export default Navbar;
