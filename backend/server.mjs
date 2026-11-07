import { createServer } from "node:http";
import { handler as menuHandler } from "./menu.mjs";
import { handler as orderHandler } from "./order.mjs";

const PORT = 3000;

const server = createServer(async (req, res) => {
  // Allow requests from Vite dev server and CloudFront
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url?.split("?")[0];

  try {
    // Menu endpoint (supports both /menu and /api/menu)
    if (req.method === "GET" && (url === "/menu" || url === "/api/menu")) {
      const result = await menuHandler({ httpMethod: "GET" });

      res.writeHead(result.statusCode, {
        ...result.headers,
        "Content-Type": "application/json",
      });
      res.end(result.body);
      return;
    }

    // Orders endpoint (supports both /orders and /api/orders)
    if (req.method === "POST" && (url === "/orders" || url === "/api/orders")) {
      let body = "";

      for await (const chunk of req) {
        body += chunk;
      }

      const result = await orderHandler({
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

    res.writeHead(404, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        success: false,
        message: `Endpoint ${req.method} ${url} not found`,
      })
    );
  } catch (error) {
    console.error("Server error:", error);

    res.writeHead(500, {
      "Content-Type": "application/json",
    });

    res.end(
      JSON.stringify({
        success: false,
        message: "Internal server error",
      })
    );
  }
});

server.listen(PORT, () => {
  console.log(`FoodHub local test backend running at http://localhost:${PORT}`);
  console.log(`- GET  http://localhost:${PORT}/menu`);
  console.log(`- POST http://localhost:${PORT}/orders`);
});
