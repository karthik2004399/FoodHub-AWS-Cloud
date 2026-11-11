import { useState, useEffect } from "react";
import Navbar from "./components/navbar";
import Hero from "./components/Hero";
import Categories from "./components/Categories";
import Menu from "./components/Menu";
import Login from "./components/Login";
import Cart from "./components/Cart";
import Checkout from "./components/Checkout";
import MyOrders from "./components/MyOrders";
import About from "./components/About";
import Contact from "./components/Contact";
import Footer from "./components/Footer";
import AdminDashboard from "./components/admin/AdminDashboard";
import { WhyChooseUs, Testimonials } from "./components/HomeSections";
import { authService } from "./services/auth";
import { getCartItemId, updateCartItemsQuantity } from "./utils/orderSummary";

function App() {
  // Authentication State
  const [user, setUser] = useState(() => authService.getCurrentUser());
  const [pendingCartItem, setPendingCartItem] = useState(null);
  const [pendingView, setPendingView] = useState(null);

  // Navigation / View State: 'home' | 'menu' | 'my-orders' | 'about' | 'contact' | 'login' | 'checkout' | 'admin'
  const [currentView, setCurrentView] = useState(() => {
    const hash = window.location.hash.replace("#", "").replace("/", "");
    const pathname = window.location.pathname.replace("/", "");
    if (pathname === "admin" || hash === "admin") return "admin";
    if (pathname === "my-orders" || hash === "my-orders") return "my-orders";
    if (hash === "menu") return "menu";
    if (hash === "about") return "about";
    if (hash === "contact") return "contact";
    if (hash === "login") return "login";
    return "home";
  });

  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Keep URL hash updated with currentView
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace("#", "").replace("/", "");
      const pathname = window.location.pathname.replace("/", "");
      if (pathname === "admin" || hash === "admin") {
        setCurrentView("admin");
      } else if (hash) {
        setCurrentView(hash);
      } else {
        setCurrentView("home");
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("hashchange", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("hashchange", handlePopState);
    };
  }, []);

  const navigateTo = (view) => {
    setCurrentView(view);
    window.location.hash = `#/${view === "home" ? "" : view}`;
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Add to Cart handler with customer authentication protection
  const handleAddToCart = (food) => {
    // If not authenticated, require login first
    if (!user) {
      setPendingCartItem(food);
      navigateTo("login");
      return;
    }

    setCart((currentCart) => {
      const foodId = food.id || food.itemId;
      const existingItem = currentCart.find(
        (item) => (item.id || item.itemId) === foodId
      );

      if (existingItem) {
        return currentCart.map((item) =>
          (item.id || item.itemId) === foodId
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...food,
          id: foodId,
          price: Number(food.price),
          image: food.image || food.imageUrl,
          quantity: 1,
        },
      ];
    });
  };

  const handleUpdateQuantity = (id, change) => {
    setCart((currentCart) => updateCartItemsQuantity(currentCart, id, change));
  };

  const handleRemoveItem = (id) => {
    setCart((currentCart) =>
      currentCart.filter((item) => getCartItemId(item) !== id)
    );
  };

  // Handle successful login
  const handleLogin = (authenticatedUser) => {
    setUser(authenticatedUser);

    // If customer was trying to add an item before logging in:
    if (pendingCartItem) {
      const foodId = pendingCartItem.id || pendingCartItem.itemId;
      setCart((currentCart) => [
        ...currentCart,
        {
          ...pendingCartItem,
          id: foodId,
          price: Number(pendingCartItem.price),
          image: pendingCartItem.image || pendingCartItem.imageUrl,
          quantity: 1,
        },
      ]);
      setPendingCartItem(null);
      setShowCart(true);
      navigateTo("home");
      return;
    }

    if (pendingView) {
      const targetView = pendingView;
      setPendingView(null);
      navigateTo(targetView);
      return;
    }

    // If logged in as admin with genuine Cognito admin group, route to admin dashboard
    if (authService.isAdmin()) {
      navigateTo("admin");
    } else {
      navigateTo("home");
    }
  };

  const handleLogout = () => {
    authService.logout();
    setUser(null);
    setPendingView(null);
    navigateTo("home");
  };

  // Receives confirmed order directly from Checkout.jsx after backend confirmation
  // Clears cart while leaving Checkout mounted so the Order Confirmation receipt stays visible
  const handlePlaceOrder = (confirmedOrder) => {
    console.log("Order confirmed by backend:", confirmedOrder?.orderId);
    setCart([]);
  };

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  // If in admin view, verify genuine Cognito admin claim
  if (currentView === "admin") {
    if (!user || !authService.isAdmin()) {
      return (
        <div className="min-h-screen bg-orange-50">
          <Navbar
            user={user}
            cartCount={cartCount}
            currentView={currentView}
            onNavigate={navigateTo}
            onLoginClick={() => navigateTo("login")}
            onCartClick={() => setShowCart(true)}
            onLogout={handleLogout}
          />
          <div className="mx-auto max-w-md px-6 py-16">
            <Login
              initialAdmin={true}
              onLogin={handleLogin}
              onCancel={() => navigateTo("home")}
            />
          </div>
          <Footer onNavigate={navigateTo} />
        </div>
      );
    }

    return (
      <AdminDashboard
        user={user}
        onLogout={handleLogout}
        onBackToSite={() => navigateTo("home")}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-orange-50/40 text-gray-900">
      <Navbar
        user={user}
        cartCount={cartCount}
        currentView={currentView}
        onNavigate={navigateTo}
        onLoginClick={() => navigateTo("login")}
        onCartClick={() => {
          if (!user) {
            navigateTo("login");
          } else {
            setShowCart(true);
          }
        }}
        onLogout={handleLogout}
      />

      <div className="flex-1">
        {/* VIEW: LOGIN & REGISTRATION */}
        {currentView === "login" && (
          <Login
            onLogin={handleLogin}
            onCancel={() => navigateTo("home")}
          />
        )}

        {/* VIEW: CHECKOUT */}
        {currentView === "checkout" && (
          <Checkout
            cart={cart}
            user={user}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onPlaceOrder={handlePlaceOrder}
            onOrderMore={() => navigateTo("menu")}
            onViewOrders={() => navigateTo("my-orders")}
            onBack={() => navigateTo("home")}
          />
        )}

        {/* VIEW: MY ORDERS */}
        {currentView === "my-orders" && (
          <MyOrders
            user={user}
            onExploreMenu={() => navigateTo("menu")}
            onBack={() => navigateTo("home")}
            onLoginClick={() => {
              setPendingView("my-orders");
              navigateTo("login");
            }}
          />
        )}

        {/* VIEW: DEDICATED MENU */}
        {currentView === "menu" && (
          <Menu
            isFullPage={true}
            onAddToCart={handleAddToCart}
            selectedCategory={selectedCategory}
            onSelectCategory={setSelectedCategory}
          />
        )}

        {/* VIEW: ABOUT US */}
        {currentView === "about" && (
          <About onExploreMenu={() => navigateTo("menu")} />
        )}

        {/* VIEW: CONTACT US */}
        {currentView === "contact" && (
          <Contact />
        )}

        {/* VIEW: HOME (Default) */}
        {currentView === "home" && (
          <>
            <Hero
              onExploreMenu={() => navigateTo("menu")}
              onOrderNow={() => navigateTo("menu")}
            />
            <Categories
              selectedCategory={selectedCategory}
              onSelectCategory={(cat) => {
                setSelectedCategory(cat);
              }}
            />
            <Menu
              onAddToCart={handleAddToCart}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
            <WhyChooseUs onOrderNow={() => navigateTo("menu")} />
            <Testimonials />
          </>
        )}
      </div>

      {/* Cart Drawer */}
      {showCart && (
        <Cart
          cart={cart}
          onUpdateQuantity={handleUpdateQuantity}
          onRemoveItem={handleRemoveItem}
          onClose={() => setShowCart(false)}
          onCheckout={() => {
            setShowCart(false);
            if (!user) {
              navigateTo("login");
            } else {
              navigateTo("checkout");
            }
          }}
        />
      )}

      {/* Global Footer on customer views */}
      <Footer onNavigate={navigateTo} />
    </div>
  );
}

export default App;
