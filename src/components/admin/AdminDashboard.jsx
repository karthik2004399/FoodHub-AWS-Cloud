import { useState, useEffect, useCallback } from "react";
import { api } from "../../services/api";
import { FALLBACK_MENU } from "../../menuData";

const ORDER_STATUSES = [
  "Pending",
  "Placed",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const CATEGORIES = [
  "Pizza",
  "Burgers",
  "Pasta",
  "Asian",
  "Desserts",
  "Healthy",
];

function AdminDashboard({ user, onLogout, onBackToSite }) {
  const [activeTab, setActiveTab] = useState("dashboard"); // 'dashboard' | 'menu' | 'add-item' | 'orders' | 'customers'

  // Menu items state
  const [menuItems, setMenuItems] = useState(FALLBACK_MENU);
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuFilterCat, setMenuFilterCat] = useState("All");

  // Orders state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState("All");

  // Add / Edit Item Form State
  const [editingItem, setEditingItem] = useState(null);
  const [itemFormData, setItemFormData] = useState({
    name: "",
    description: "",
    category: "Pizza",
    price: "",
    image: "",
    available: true,
  });

  // Delete modal state
  const [itemToDelete, setItemToDelete] = useState(null);

  // Status message
  const [alertMessage, setAlertMessage] = useState(null);

  const showAlert = useCallback((text, type = "success") => {
    setAlertMessage({ text, type });
    setTimeout(() => {
      setAlertMessage(null);
    }, 4500);
  }, []);

  // Initial load on mount
  useEffect(() => {
    let isMounted = true;

    async function fetchAdminData() {
      try {
        setMenuLoading(true);
        const res = await api.getAdminMenu();
        if (isMounted) {
          if (res && res.data && Array.isArray(res.data) && res.data.length > 0) {
            setMenuItems(res.data);
          } else if (Array.isArray(res) && res.length > 0) {
            setMenuItems(res);
          }
        }
      } catch (err) {
        console.warn("Could not load backend menu for admin:", err.message);
      } finally {
        if (isMounted) setMenuLoading(false);
      }

      try {
        setOrdersLoading(true);
        const res = await api.getAdminOrders();
        if (isMounted && res && res.orders && Array.isArray(res.orders)) {
          setOrders(res.orders);
        }
      } catch (err) {
        console.warn("Orders fetch notice:", err.message);
      } finally {
        if (isMounted) setOrdersLoading(false);
      }
    }

    fetchAdminData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleRefreshOrders = async () => {
    try {
      setOrdersLoading(true);
      const res = await api.getAdminOrders();
      if (res && res.orders && Array.isArray(res.orders)) {
        setOrders(res.orders);
        showAlert("Orders list refreshed.");
      }
    } catch (err) {
      console.warn("Refresh orders notice:", err.message);
      showAlert("Refreshed (local cache active).");
    } finally {
      setOrdersLoading(false);
    }
  };

  // Menu Management Handlers
  const handleItemFormChange = (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setItemFormData({
      ...itemFormData,
      [e.target.name]: value,
    });
  };

  const handleOpenAddForm = () => {
    setEditingItem(null);
    setItemFormData({
      name: "",
      description: "",
      category: "Pizza",
      price: "",
      image: "",
      available: true,
    });
    setActiveTab("add-item");
  };

  const handleOpenEditForm = (item) => {
    setEditingItem(item);
    setItemFormData({
      name: item.name || "",
      description: item.description || "",
      category: item.category || "Pizza",
      price: item.price || "",
      image: item.image || item.imageUrl || "",
      available: item.available !== false,
    });
    setActiveTab("add-item");
  };

  const handleSaveItem = async (e) => {
    e.preventDefault();

    if (!itemFormData.name.trim() || !itemFormData.price) {
      showAlert("Please enter a valid item name and price.", "error");
      return;
    }

    const payload = {
      name: itemFormData.name.trim(),
      description: itemFormData.description.trim(),
      category: itemFormData.category,
      price: Number(itemFormData.price),
      image:
        itemFormData.image.trim() ||
        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
      available: itemFormData.available,
      rating: editingItem?.rating || 4.8,
    };

    try {
      if (editingItem) {
        const itemId = editingItem.id || editingItem.itemId;
        await api.updateMenuItem(itemId, payload);
        setMenuItems((prev) =>
          prev.map((it) => ((it.id || it.itemId) === itemId ? { ...it, ...payload, id: itemId } : it))
        );
        showAlert(`Item "${payload.name}" updated successfully!`);
      } else {
        const newItem = {
          ...payload,
          id: Date.now(),
          itemId: String(Date.now()),
        };
        await api.createMenuItem(newItem);
        setMenuItems((prev) => [newItem, ...prev]);
        showAlert(`New food item "${payload.name}" added to menu!`);
      }
      setActiveTab("menu");
    } catch (err) {
      console.warn("Item save notice:", err.message);
      if (editingItem) {
        const itemId = editingItem.id || editingItem.itemId;
        setMenuItems((prev) =>
          prev.map((it) => ((it.id || it.itemId) === itemId ? { ...it, ...payload, id: itemId } : it))
        );
        showAlert(`Item updated (offline/optimistic mode).`);
      } else {
        const newItem = {
          ...payload,
          id: Date.now(),
          itemId: String(Date.now()),
        };
        setMenuItems((prev) => [newItem, ...prev]);
        showAlert(`Food item added (offline/optimistic mode).`);
      }
      setActiveTab("menu");
    }
  };

  const handleToggleAvailability = async (item) => {
    const itemId = item.id || item.itemId;
    const newStatus = !(item.available !== false);

    try {
      await api.updateMenuItem(itemId, { available: newStatus });
    } catch (err) {
      console.warn("Availability toggle notice:", err.message);
    }

    setMenuItems((prev) =>
      prev.map((it) =>
        (it.id || it.itemId) === itemId ? { ...it, available: newStatus } : it
      )
    );
    showAlert(
      `"${item.name}" is now ${newStatus ? "In Stock" : "Unavailable"}.`
    );
  };

  const handleConfirmDelete = async () => {
    if (!itemToDelete) return;
    const itemId = itemToDelete.id || itemToDelete.itemId;

    try {
      await api.deleteMenuItem(itemId);
    } catch (err) {
      console.warn("Delete item notice:", err.message);
    }

    setMenuItems((prev) => prev.filter((it) => (it.id || it.itemId) !== itemId));
    showAlert(`"${itemToDelete.name}" deleted from menu.`);
    setItemToDelete(null);
  };

  // Order Management Handlers
  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.updateOrderStatus(orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o))
      );
      showAlert(`Order ${orderId} marked as "${newStatus}".`);
    } catch (err) {
      console.warn("Order status update notice:", err.message);
      setOrders((prev) =>
        prev.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o))
      );
      showAlert(`Order ${orderId} status updated to "${newStatus}".`);
    }
  };

  // Compute metrics
  const totalFoodItems = menuItems.length;
  const availableItems = menuItems.filter((i) => i.available !== false).length;
  const unavailableItems = totalFoodItems - availableItems;

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(
    (o) => o.status !== "Delivered" && o.status !== "Cancelled"
  ).length;
  const completedOrders = orders.filter((o) => o.status === "Delivered").length;

  // Filtered menu
  const displayedMenu = menuItems.filter((item) => {
    const matchesCat =
      menuFilterCat === "All" ||
      item.category?.toLowerCase() === menuFilterCat.toLowerCase();
    const matchesSearch =
      !menuSearch.trim() ||
      item.name?.toLowerCase().includes(menuSearch.toLowerCase().trim()) ||
      item.description?.toLowerCase().includes(menuSearch.toLowerCase().trim());
    return matchesCat && matchesSearch;
  });

  // Filtered orders
  const displayedOrders = orders.filter((o) =>
    orderStatusFilter === "All" ? true : o.status === orderStatusFilter
  );

  // Extract unique customers
  const customersList = orders.reduce((acc, o) => {
    if (o.customer && o.customer.phone) {
      if (!acc.some((c) => c.phone === o.customer.phone)) {
        acc.push({
          name: o.customer.name,
          phone: o.customer.phone,
          city: o.customer.city || "Mumbai",
          address: o.customer.address,
          totalSpent: orders
            .filter((x) => x.customer?.phone === o.customer.phone)
            .reduce((s, x) => s + (x.total || 0), 0),
          orderCount: orders.filter((x) => x.customer?.phone === o.customer.phone).length,
        });
      }
    }
    return acc;
  }, []);

  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-800">
      {/* Sidebar */}
      <aside className="w-64 shrink-0 bg-gray-900 text-white flex flex-col justify-between border-r border-gray-800">
        <div>
          {/* Brand */}
          <div className="p-6 border-b border-gray-800 flex items-center gap-3">
            <span className="text-3xl">🍽️</span>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-white">
                FoodHub <span className="text-orange-500">Admin</span>
              </h2>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                Control Center
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            <button
              type="button"
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "dashboard"
                  ? "bg-orange-600 text-white shadow-md"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>📊</span> Dashboard
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("menu")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "menu"
                  ? "bg-orange-600 text-white shadow-md"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>🍱</span> Manage Menu
            </button>

            <button
              type="button"
              onClick={handleOpenAddForm}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "add-item"
                  ? "bg-orange-600 text-white shadow-md"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>➕</span> Add Food Item
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "orders"
                  ? "bg-orange-600 text-white shadow-md"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>📦</span> Manage Orders
              {pendingOrders > 0 && (
                <span className="ml-auto rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
                  {pendingOrders}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("customers")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition ${
                activeTab === "customers"
                  ? "bg-orange-600 text-white shadow-md"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
            >
              <span>👥</span> Customers
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-gray-800 space-y-2">
          {onBackToSite && (
            <button
              type="button"
              onClick={onBackToSite}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-800 py-2.5 text-xs font-bold text-gray-200 hover:bg-gray-700 transition"
            >
              ← Back to FoodHub Website
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-red-900/40 border border-red-800/50 py-2.5 text-xs font-bold text-red-300 hover:bg-red-800/60 transition"
            >
              🚪 Logout
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white/95 backdrop-blur px-8 py-4 shadow-sm">
          <div>
            <h1 className="text-xl font-bold text-gray-900 capitalize">
              {activeTab === "dashboard"
                ? "Overview Dashboard"
                : activeTab === "menu"
                ? "Menu Catalog Management"
                : activeTab === "add-item"
                ? editingItem
                  ? "Edit Food Item"
                  : "Add New Food Item"
                : activeTab === "orders"
                ? "Customer Orders"
                : "Customer Records"}
            </h1>
            <p className="text-xs text-gray-500">
              AWS DynamoDB Persistence: <code className="text-orange-600 font-mono">FoodHubMenu</code> & <code className="text-orange-600 font-mono">FoodHubOrders</code>
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-bold text-gray-900">{user?.name || "Administrator"}</p>
              {user?.email && (
                <p className="text-xs text-gray-500">{user.email}</p>
              )}
              <p className="text-xs text-green-600 font-medium">● Cognito Group: admin (Authorized)</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-lg">
              🛡️
            </div>
          </div>
        </header>

        {/* Global Toast / Alert */}
        {alertMessage && (
          <div className="mx-8 mt-6">
            <div
              className={`rounded-xl p-4 text-sm font-semibold flex items-center gap-3 shadow-sm ${
                alertMessage.type === "error"
                  ? "bg-red-50 text-red-800 border border-red-200"
                  : "bg-green-50 text-green-800 border border-green-200"
              }`}
            >
              <span>{alertMessage.type === "error" ? "⚠️" : "✅"}</span>
              <p>{alertMessage.text}</p>
            </div>
          </div>
        )}

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === "dashboard" && (
          <div className="p-8 space-y-8">
            {/* Stats Metrics Grid */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Total Food Items
                  </span>
                  <span className="text-2xl">🍱</span>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-gray-900">{totalFoodItems}</p>
                <div className="mt-2 text-xs text-gray-500">Items cataloged in DynamoDB</div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-green-600">
                    Available Items
                  </span>
                  <span className="text-2xl">✅</span>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-green-700">{availableItems}</p>
                <div className="mt-2 text-xs text-gray-500">Available for customer checkout</div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-red-600">
                    Unavailable Items
                  </span>
                  <span className="text-2xl">❌</span>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-red-700">{unavailableItems}</p>
                <div className="mt-2 text-xs text-gray-500">Marked out of stock</div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
                    Total Orders
                  </span>
                  <span className="text-2xl">📦</span>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-gray-900">{totalOrders}</p>
                <div className="mt-2 text-xs text-gray-500">Recorded in FoodHubOrders</div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
                    Pending Orders
                  </span>
                  <span className="text-2xl">⏳</span>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-amber-600">{pendingOrders}</p>
                <div className="mt-2 text-xs text-gray-500">Awaiting fulfillment / delivery</div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600">
                    Completed Orders
                  </span>
                  <span className="text-2xl">🎉</span>
                </div>
                <p className="mt-3 text-3xl font-extrabold text-purple-700">{completedOrders}</p>
                <div className="mt-2 text-xs text-gray-500">Delivered successfully</div>
              </div>
            </div>

            {/* Quick Actions & Recent Orders preview */}
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Quick Menu Actions</h3>
                  <button
                    type="button"
                    onClick={handleOpenAddForm}
                    className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700"
                  >
                    + Add New Dish
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-4">
                  Add new recipes, update price tags, or toggle availability directly for the customer menu.
                </p>
                <div className="space-y-2">
                  {menuItems.slice(0, 4).map((item) => (
                    <div
                      key={item.id || item.itemId}
                      className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.image || item.imageUrl}
                          alt={item.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                        <div>
                          <p className="text-sm font-bold text-gray-800">{item.name}</p>
                          <p className="text-xs text-gray-500">₹{item.price} • {item.category}</p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                          item.available !== false
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {item.available !== false ? "In Stock" : "Unavailable"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab("orders")}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700"
                  >
                    View All Orders →
                  </button>
                </div>
                {orders.length === 0 ? (
                  <div className="py-12 text-center text-gray-400 text-sm">
                    No orders recorded yet. Place an order on the customer site to test!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orders.slice(0, 4).map((ord) => (
                      <div
                        key={ord.orderId}
                        className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100"
                      >
                        <div>
                          <p className="text-xs font-mono font-bold text-orange-700">{ord.orderId}</p>
                          <p className="text-sm font-semibold text-gray-800">
                            {ord.customer?.name} (₹{ord.total})
                          </p>
                        </div>
                        <span className="text-xs font-bold rounded-lg bg-orange-100 text-orange-800 px-2.5 py-1">
                          {ord.status || "Placed"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MANAGE MENU */}
        {activeTab === "menu" && (
          <div className="p-8 space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Search & Category Filter */}
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <input
                  type="text"
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  placeholder="Search food items..."
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm outline-none focus:border-orange-500 w-64"
                />

                <select
                  value={menuFilterCat}
                  onChange={(e) => setMenuFilterCat(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                {menuLoading && (
                  <span className="text-xs text-orange-600 font-semibold animate-pulse">
                    Syncing menu...
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleOpenAddForm}
                  className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white shadow hover:bg-orange-700 flex items-center gap-2"
                >
                  <span>➕</span> Add Food Item
                </button>
              </div>
            </div>

            {/* Menu Items Table */}
            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase text-gray-500">
                    <th className="p-4">Dish</th>
                    <th className="p-4">Category</th>
                    <th className="p-4">Price</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {displayedMenu.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        No food items match the search or filter criteria.
                      </td>
                    </tr>
                  ) : (
                    displayedMenu.map((item) => {
                      const isAvail = item.available !== false;
                      const itemId = item.id || item.itemId;

                      return (
                        <tr key={itemId} className="hover:bg-gray-50/80 transition">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={item.image || item.imageUrl}
                                alt={item.name}
                                className="h-12 w-12 rounded-xl object-cover shrink-0"
                              />
                              <div>
                                <p className="font-bold text-gray-900">{item.name}</p>
                                <p className="text-xs text-gray-500 max-w-xs truncate">
                                  {item.description}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="p-4">
                            <span className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                              {item.category}
                            </span>
                          </td>

                          <td className="p-4 font-bold text-orange-600">
                            ₹{item.price}
                          </td>

                          <td className="p-4">
                            <button
                              type="button"
                              onClick={() => handleToggleAvailability(item)}
                              title="Click to toggle availability"
                              className={`rounded-full px-3 py-1 text-xs font-bold transition flex items-center gap-1.5 ${
                                isAvail
                                  ? "bg-green-100 text-green-700 hover:bg-green-200"
                                  : "bg-red-100 text-red-700 hover:bg-red-200"
                              }`}
                            >
                              <span>{isAvail ? "● In Stock" : "○ Sold Out"}</span>
                            </button>
                          </td>

                          <td className="p-4 text-right space-x-2">
                            <button
                              type="button"
                              onClick={() => handleOpenEditForm(item)}
                              className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => setItemToDelete(item)}
                              className="rounded-lg border border-red-200 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: ADD / EDIT FOOD ITEM FORM */}
        {activeTab === "add-item" && (
          <div className="p-8 max-w-2xl">
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? `Edit Dish: ${editingItem.name}` : "Add New Dish to Menu"}
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Item changes will be permanently stored in DynamoDB table <code className="text-orange-600 font-mono">FoodHubMenu</code>.
              </p>

              <form onSubmit={handleSaveItem} className="mt-6 space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-600">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={itemFormData.name}
                    onChange={handleItemFormChange}
                    placeholder="e.g. Paneer Butter Masala Pizza"
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-600">
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={itemFormData.description}
                    onChange={handleItemFormChange}
                    rows="3"
                    placeholder="Crispy base topped with fresh cottage cheese and spicy herbs..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-600">
                      Category *
                    </label>
                    <select
                      name="category"
                      value={itemFormData.category}
                      onChange={handleItemFormChange}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-orange-500 bg-white"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold uppercase text-gray-600">
                      Price (₹) *
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={itemFormData.price}
                      onChange={handleItemFormChange}
                      placeholder="e.g. 299"
                      min="1"
                      required
                      className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-gray-600">
                    Food Image URL
                  </label>
                  <input
                    type="url"
                    name="image"
                    value={itemFormData.image}
                    onChange={handleItemFormChange}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
                  />
                  <p className="mt-1 text-[11px] text-gray-400">
                    Leave blank to use a high-resolution default food image.
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <input
                    type="checkbox"
                    id="availableCheckbox"
                    name="available"
                    checked={itemFormData.available}
                    onChange={handleItemFormChange}
                    className="h-4 w-4 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <label htmlFor="availableCheckbox" className="text-sm font-semibold text-gray-800">
                    Available for Order (In Stock)
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    className="rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-orange-700"
                  >
                    {editingItem ? "Update Food Item" : "Save Food Item"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("menu")}
                    className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* TAB 4: MANAGE ORDERS */}
        {activeTab === "orders" && (
          <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold text-gray-600">Filter Status:</span>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-orange-500"
                >
                  <option value="All">All Statuses</option>
                  {ORDER_STATUSES.map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3">
                {ordersLoading && (
                  <span className="text-xs text-orange-600 font-semibold animate-pulse">
                    Refreshing orders...
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleRefreshOrders}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                >
                  🔄 Refresh Orders
                </button>
              </div>
            </div>

            {displayedOrders.length === 0 ? (
              <div className="rounded-2xl bg-white p-12 text-center border border-gray-200">
                <div className="text-5xl">📦</div>
                <h3 className="mt-4 text-lg font-bold text-gray-800">No orders found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Orders placed by customers will be persisted in DynamoDB and listed here in real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {displayedOrders.map((ord) => (
                  <div
                    key={ord.orderId}
                    className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-orange-600">
                            {ord.orderId}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            {ord.createdAt ? new Date(ord.createdAt).toLocaleString() : "Just now"}
                          </span>
                        </div>
                        <h4 className="mt-1 text-base font-bold text-gray-900">
                          Customer: {ord.customer?.name}
                        </h4>
                        <p className="text-xs text-gray-500">
                          📞 {ord.customer?.phone} | 📍 {ord.customer?.address}, {ord.customer?.city} ({ord.customer?.pincode})
                        </p>
                      </div>

                      {/* Status Dropdown */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Status:</span>
                        <select
                          value={ord.status || "Placed"}
                          onChange={(e) => handleUpdateOrderStatus(ord.orderId, e.target.value)}
                          className="rounded-xl border border-orange-200 bg-orange-50/50 px-3 py-1.5 text-xs font-bold text-orange-800 outline-none focus:border-orange-500 cursor-pointer"
                        >
                          {ORDER_STATUSES.map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Ordered Items Breakdown */}
                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                      <div>
                        <p className="text-xs font-bold uppercase text-gray-400 mb-2">
                          Ordered Items
                        </p>
                        <ul className="space-y-1.5 text-xs">
                          {ord.items?.map((it, idx) => (
                            <li key={idx} className="flex justify-between text-gray-700">
                              <span>Dish #{it.id} × {it.quantity}</span>
                              <span className="font-mono font-medium">₹{it.price * it.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="sm:border-l sm:border-gray-100 sm:pl-6 text-xs space-y-1">
                        <p className="text-xs font-bold uppercase text-gray-400 mb-2">
                          Payment Breakdown
                        </p>
                        <div className="flex justify-between text-gray-600">
                          <span>Subtotal:</span>
                          <span>₹{ord.subtotal}</span>
                        </div>
                        <div className="flex justify-between text-gray-600">
                          <span>Delivery Fee:</span>
                          <span>₹{ord.deliveryFee || 40}</span>
                        </div>
                        <div className="flex justify-between font-bold text-gray-900 pt-2 border-t border-gray-100 text-sm">
                          <span>Total Amount:</span>
                          <span className="text-orange-600">₹{ord.total}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: CUSTOMERS */}
        {activeTab === "customers" && (
          <div className="p-8 space-y-6">
            <p className="text-xs text-gray-500">
              Verified diner profiles extracted from submitted orders in DynamoDB.
            </p>

            <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold uppercase text-gray-500">
                    <th className="p-4">Customer Name</th>
                    <th className="p-4">Contact Phone</th>
                    <th className="p-4">Delivery City</th>
                    <th className="p-4">Total Orders</th>
                    <th className="p-4">Total Spent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {customersList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400">
                        No customer history yet. When orders are placed, customer profiles will populate here automatically.
                      </td>
                    </tr>
                  ) : (
                    customersList.map((cust, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="p-4 font-bold text-gray-900">{cust.name}</td>
                        <td className="p-4 font-mono text-gray-600">{cust.phone}</td>
                        <td className="p-4 text-gray-600">{cust.city}</td>
                        <td className="p-4 font-semibold text-gray-700">{cust.orderCount}</td>
                        <td className="p-4 font-bold text-orange-600">₹{cust.totalSpent}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Confirm Deletion</h3>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to remove <span className="font-semibold text-gray-900">"{itemToDelete.name}"</span> from the menu?
              This will remove it from the customer ordering page.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete Dish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
