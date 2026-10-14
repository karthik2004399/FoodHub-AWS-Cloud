import { createServer } from "node:http";
import { handler as menuHandler } from "./menu.mjs";
import { handler as orderHandler } from "./order.mjs";

const PORT = 3000;

const server = createServer(async (req, res) => {
  // Allow requests from the local React development server
  res.setHeader("Access-Control-Allow-Origin", "http://localhost:5173");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  try {
    if (req.method === "GET" && req.url === "/api/menu") {
      const result = await menuHandler({});

      res.writeHead(result.statusCode, result.headers);
      res.end(result.body);
      return;
    }

    if (req.method === "POST" && req.url === "/api/orders") {
      let body = "";

      for await (const chunk of req) {
        body += chunk;
      }

      const result = await orderHandler({ body });

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

    res.end(JSON.stringify({
      success: false,
      message: "Endpoint not found",
    }));
  } catch (error) {
    console.error("Server error:", error);

    res.writeHead(500, {
      "Content-Type": "application/json",
    });

    res.end(JSON.stringify({
      success: false,
      message: "Internal server error",
    }));
  }
});

server.listen(PORT, () => {
  console.log(`FoodHub backend running at http://localhost:${PORT}`);
});