import { createServer } from "node:http";
import { handler as menuHandler } from "./menu.mjs";
import { handler as orderHandler } from "./order.mjs";
import { handler as contactHandler } from "./contact.mjs";
import { handler as adminHandler } from "./admin.mjs";

const PORT = process.env.PORT || 3000;

const server = createServer(async (req, res) => {
  // Common CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url?.split("?")[0] || "";

  // Read request body if present
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }

  try {
    // 1. PUBLIC MENU: GET /menu or /api/menu
    if (req.method === "GET" && (url === "/menu" || url === "/api/menu")) {
      const result = await menuHandler({ httpMethod: "GET" });
      res.writeHead(result.statusCode, {
        ...result.headers,
        "Content-Type": "application/json",
      });
      res.end(result.body);
      return;
    }

    // 2. CUSTOMER ORDERS: GET & POST /orders or /api/orders
    if (
      (req.method === "GET" || req.method === "POST") &&
      (url.startsWith("/orders") || url.startsWith("/api/orders"))
    ) {
      const result = await orderHandler({
        httpMethod: req.method,
        path: url.replace(/^\/api/, ""),
        headers: req.headers,
        body,
      });
      res.writeHead(result.statusCode, {
        ...result.headers,
        "Content-Type": "application/json",
      });
      res.end(result.body);
      return;
    }

    // 3. CONTACT FORM: POST /contact or /api/contact
    if (req.method === "POST" && (url === "/contact" || url === "/api/contact")) {
      const result = await contactHandler({
        httpMethod: "POST",
        body,
      });
      res.writeHead(result.statusCode, {
        ...result.headers,
        "Content-Type": "application/json",
      });
      res.end(result.body);
      return;
    }

    // 4. ADMIN API ROUTER: All /admin/* routes
    if (url.startsWith("/admin")) {
      const result = await adminHandler({
        httpMethod: req.method,
        path: url,
        headers: req.headers,
        body,
      });
      res.writeHead(result.statusCode, {
        ...result.headers,
        "Content-Type": "application/json",
      });
      res.end(result.body);
      return;
    }

    // Not found
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        message: `Endpoint ${req.method} ${url} not found`,
      })
    );
  } catch (error) {
    console.error("Local Server Error:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        message: "Internal server error",
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(`FoodHub local test server running on http://localhost:${PORT}`);
  console.log(`- GET    http://localhost:${PORT}/menu`);
  console.log(`- POST   http://localhost:${PORT}/orders`);
  console.log(`- POST   http://localhost:${PORT}/contact`);
  console.log(`- POST   http://localhost:${PORT}/admin/menu`);
  console.log(`- PUT    http://localhost:${PORT}/admin/menu/:id`);
  console.log(`- DELETE http://localhost:${PORT}/admin/menu/:id`);
  console.log(`- GET    http://localhost:${PORT}/admin/orders`);
  console.log(`- PATCH  http://localhost:${PORT}/admin/orders/:id`);
});
