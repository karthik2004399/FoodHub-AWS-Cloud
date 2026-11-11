import { authService } from "./auth";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://p58iopju3f.execute-api.ap-south-1.amazonaws.com";

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  // Attach genuine Amazon Cognito Access Token
  const token = authService.getAccessToken() || authService.getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response = await fetch(url, {
    ...options,
    headers,
  });

  // If 401 Unauthorized, attempt silent token refresh once if refresh token is available
  const isProtected =
    endpoint.startsWith("/admin") || endpoint.startsWith("/orders");
  if (response.status === 401 && isProtected) {
    const refreshed = await authService.refreshSession();
    if (refreshed?.accessToken) {
      headers.Authorization = `Bearer ${refreshed.accessToken}`;
      response = await fetch(url, {
        ...options,
        headers,
      });
    }
  }

  const contentType = response.headers.get("content-type") || "";
  let data = null;
  if (contentType.includes("application/json")) {
    data = await response.json().catch(() => null);
  }

  if (!response.ok) {
    if (response.status === 401 && isProtected) {
      console.warn("Cognito session expired or invalid for protected route.");
    }
    const errorMsg =
      data?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Public Menu
  async getMenu() {
    return request("/menu", { method: "GET" });
  },

  // Customer Orders (Cognito authenticated)
  async getMyOrders() {
    return request("/orders", { method: "GET" });
  },

  // Order Creation
  async createOrder(payload) {
    return request("/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Contact Form Submission
  async sendContact(payload) {
    return request("/contact", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // Admin Menu Endpoints
  async getAdminMenu() {
    return request("/menu", { method: "GET" });
  },

  async createMenuItem(item) {
    return request("/admin/menu", {
      method: "POST",
      body: JSON.stringify(item),
    });
  },

  async updateMenuItem(itemId, item) {
    return request(`/admin/menu/${itemId}`, {
      method: "PUT",
      body: JSON.stringify(item),
    });
  },

  async deleteMenuItem(itemId) {
    return request(`/admin/menu/${itemId}`, {
      method: "DELETE",
    });
  },

  // Admin Order Endpoints
  async getAdminOrders() {
    return request("/admin/orders", { method: "GET" });
  },

  async updateOrderStatus(orderId, status) {
    return request(`/admin/orders/${orderId}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
  },
};
