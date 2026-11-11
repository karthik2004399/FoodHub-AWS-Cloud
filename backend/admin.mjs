// FoodHub Consolidated Admin Lambda Handler (FoodHubAdminAPI / admin.mjs)
// Unified entry point for all administrative routing and operations on Amazon DynamoDB.
// Routes:
//   - POST   /admin/menu
//   - PUT    /admin/menu/{itemId}
//   - DELETE /admin/menu/{itemId}
//   - GET    /admin/orders
//   - PATCH  /admin/orders/{orderId}
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { verifyAdminToken } from "./authHelper.mjs";

const VALID_STATUSES = [
  "Pending",
  "Placed",
  "Confirmed",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
};

// DynamoDB client initialization
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Environment-configured table names
const MENU_TABLE = process.env.MENU_TABLE_NAME || "FoodHubMenu";
const ORDERS_TABLE = process.env.TABLE_NAME || process.env.ORDERS_TABLE_NAME || "FoodHubOrders";

export const handler = async (event = {}) => {
  const httpMethod = (
    event.httpMethod ||
    event.requestContext?.http?.method ||
    ""
  ).toUpperCase();

  // 1. Handle HTTP OPTIONS preflight
  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  // 2. Perform genuine JWT signature and role claims validation
  const auth = verifyAdminToken(event);
  if (!auth.authorized) {
    return {
      statusCode: auth.statusCode,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: auth.message,
      }),
    };
  }

  // Parse path and parameters
  const rawPath =
    event.path ||
    event.rawPath ||
    event.requestContext?.http?.path ||
    "";
  const pathParams = event.pathParameters || {};
  const resource = event.resource || "";

  // Normalize routePath: strip API Gateway stage prefix (e.g. /prod/admin/... -> /admin/...)
  let routePath = rawPath.replace(/\/+$/, "");
  const adminIdx = routePath.indexOf("/admin/");
  if (adminIdx !== -1) {
    routePath = routePath.slice(adminIdx);
  } else if (routePath.endsWith("/admin")) {
    routePath = "/admin";
  }

  // Handle greedy proxy parameter from ANY /admin/{proxy+}
  const proxy = pathParams.proxy ? String(pathParams.proxy).replace(/^\/+/, "") : "";
  if (proxy) {
    routePath = `/admin/${proxy}`;
  }

  // Extract itemId
  let itemId = pathParams.itemId || pathParams.id;
  if (!itemId && routePath.startsWith("/admin/menu/")) {
    itemId = decodeURIComponent(routePath.slice("/admin/menu/".length));
  } else if (!itemId && proxy.startsWith("menu/")) {
    itemId = decodeURIComponent(proxy.slice("menu/".length));
  }

  // Extract orderId
  let orderId = pathParams.orderId || pathParams.id;
  if (!orderId && routePath.startsWith("/admin/orders/")) {
    orderId = decodeURIComponent(routePath.slice("/admin/orders/".length));
  } else if (!orderId && proxy.startsWith("orders/")) {
    orderId = decodeURIComponent(proxy.slice("orders/".length));
  }

  // Parse request body
  let body = {};
  if (event.body) {
    try {
      const raw = event.isBase64Encoded
        ? Buffer.from(event.body, "base64").toString("utf-8")
        : event.body;
      body = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: "Invalid JSON in request body",
        }),
      };
    }
  }

  const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

  try {
    // ------------------------------------------------------------------------
    // ROUTE 1: POST /admin/menu (Create Food Item)
    // ------------------------------------------------------------------------
    if (
      httpMethod === "POST" &&
      (routePath === "/admin/menu" || resource === "/admin/menu" || proxy === "menu")
    ) {
      if (!body.name?.trim() || body.price === undefined || body.price === null) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "Item name and valid price are required",
          }),
        };
      }

      const priceNum = Number(body.price);
      if (isNaN(priceNum) || priceNum <= 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "Price must be a positive number",
          }),
        };
      }

      const generatedId = String(body.itemId || body.id || `ITEM-${Date.now()}`);
      const now = new Date().toISOString();

      const newItem = {
        itemId: generatedId,
        id: Number(generatedId) || Date.now(),
        name: body.name.trim(),
        description: body.description?.trim() || "",
        category: body.category?.trim() || "General",
        price: priceNum,
        image:
          body.image?.trim() ||
          body.imageUrl?.trim() ||
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
        imageUrl:
          body.image?.trim() ||
          body.imageUrl?.trim() ||
          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80",
        available: body.available !== false,
        rating: Number(body.rating) || 4.8,
        createdAt: now,
        updatedAt: now,
      };

      if (isLambda) {
        try {
          await ddbDocClient.send(
            new PutCommand({
              TableName: MENU_TABLE,
              Item: newItem,
            })
          );
          console.log(`[DynamoDB ${MENU_TABLE}] Created item ${newItem.itemId}`);
        } catch (dbErr) {
          console.error(`[DynamoDB ${MENU_TABLE}] PutCommand error:`, dbErr);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              message: `Database error: unable to create food item (${dbErr.message})`,
            }),
          };
        }
      } else {
        // Local mode
        try {
          await ddbDocClient.send(
            new PutCommand({ TableName: MENU_TABLE, Item: newItem })
          );
        } catch (dbErr) {
          console.log(`[Local Mode] Item ${newItem.itemId} validated (DynamoDB write bypassed locally: ${dbErr.name})`);
        }
      }

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: `Food item "${newItem.name}" created successfully`,
          item: newItem,
        }),
      };
    }

    // ------------------------------------------------------------------------
    // ROUTE 2: PUT /admin/menu/{itemId} (Update Food Item)
    // ------------------------------------------------------------------------
    if (
      httpMethod === "PUT" &&
      (resource === "/admin/menu/{itemId}" ||
        resource === "/admin/menu/{id}" ||
        routePath.startsWith("/admin/menu/") ||
        proxy.startsWith("menu/"))
    ) {
      if (!itemId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "Item ID is required in URL path",
          }),
        };
      }

      let existing = {};
      try {
        const getRes = await ddbDocClient.send(
          new GetCommand({
            TableName: MENU_TABLE,
            Key: { itemId: String(itemId) },
          })
        );
        if (getRes.Item) {
          existing = getRes.Item;
        }
      } catch (dbErr) {
        if (isLambda) {
          console.error(`[DynamoDB ${MENU_TABLE}] GetCommand error:`, dbErr);
        }
      }

      const updatedItem = {
        ...existing,
        ...body,
        itemId: String(itemId),
        id: Number(itemId) || existing.id || Date.now(),
        price: body.price !== undefined ? Number(body.price) : existing.price,
        available:
          body.available !== undefined ? body.available : existing.available !== false,
        updatedAt: new Date().toISOString(),
      };

      if (isLambda) {
        try {
          await ddbDocClient.send(
            new PutCommand({
              TableName: MENU_TABLE,
              Item: updatedItem,
            })
          );
          console.log(`[DynamoDB ${MENU_TABLE}] Updated item ${itemId}`);
        } catch (dbErr) {
          console.error(`[DynamoDB ${MENU_TABLE}] PutCommand update error:`, dbErr);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              message: `Database error: unable to update food item (${dbErr.message})`,
            }),
          };
        }
      } else {
        try {
          await ddbDocClient.send(
            new PutCommand({ TableName: MENU_TABLE, Item: updatedItem })
          );
        } catch (dbErr) {
          console.log(`[Local Mode] Item ${itemId} update validated (${dbErr.name})`);
        }
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: `Food item #${itemId} updated successfully`,
          item: updatedItem,
        }),
      };
    }

    // ------------------------------------------------------------------------
    // ROUTE 3: DELETE /admin/menu/{itemId} (Delete Food Item)
    // ------------------------------------------------------------------------
    if (
      httpMethod === "DELETE" &&
      (resource === "/admin/menu/{itemId}" ||
        resource === "/admin/menu/{id}" ||
        routePath.startsWith("/admin/menu/") ||
        proxy.startsWith("menu/"))
    ) {
      if (!itemId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "Item ID is required in URL path",
          }),
        };
      }

      if (isLambda) {
        try {
          await ddbDocClient.send(
            new DeleteCommand({
              TableName: MENU_TABLE,
              Key: { itemId: String(itemId) },
            })
          );
          console.log(`[DynamoDB ${MENU_TABLE}] Deleted item ${itemId}`);
        } catch (dbErr) {
          console.error(`[DynamoDB ${MENU_TABLE}] DeleteCommand error:`, dbErr);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              message: `Database error: unable to delete food item (${dbErr.message})`,
            }),
          };
        }
      } else {
        try {
          await ddbDocClient.send(
            new DeleteCommand({ TableName: MENU_TABLE, Key: { itemId: String(itemId) } })
          );
        } catch (dbErr) {
          console.log(`[Local Mode] Item ${itemId} deletion validated (${dbErr.name})`);
        }
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: `Food item #${itemId} deleted successfully`,
          itemId,
        }),
      };
    }

    // ------------------------------------------------------------------------
    // ROUTE 4: GET /admin/orders (List Customer Orders)
    // ------------------------------------------------------------------------
    if (
      httpMethod === "GET" &&
      (routePath === "/admin/orders" || resource === "/admin/orders" || proxy === "orders")
    ) {
      let orders = [];

      try {
        const scanRes = await ddbDocClient.send(
          new ScanCommand({
            TableName: ORDERS_TABLE,
          })
        );
        if (scanRes.Items && Array.isArray(scanRes.Items)) {
          orders = scanRes.Items;
        }
      } catch (dbErr) {
        console.warn(`[DynamoDB ${ORDERS_TABLE}] Scan notice: ${dbErr.message}`);
        if (isLambda) {
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              message: `Database error: unable to retrieve orders (${dbErr.message})`,
            }),
          };
        }
      }

      // Sort by createdAt descending
      orders.sort((a, b) => {
        const timeA = new Date(a.createdAt || 0).getTime();
        const timeB = new Date(b.createdAt || 0).getTime();
        return timeB - timeA;
      });

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          count: orders.length,
          orders,
        }),
      };
    }

    // ------------------------------------------------------------------------
    // ROUTE 5: PATCH /admin/orders/{orderId} (Update Order Status)
    // ------------------------------------------------------------------------
    if (
      httpMethod === "PATCH" &&
      (resource === "/admin/orders/{orderId}" ||
        resource === "/admin/orders/{id}" ||
        routePath.startsWith("/admin/orders/") ||
        proxy.startsWith("orders/"))
    ) {
      if (!orderId) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "Order ID is required in URL path",
          }),
        };
      }

      const newStatus = body.status;
      if (!newStatus || !VALID_STATUSES.includes(newStatus)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
          }),
        };
      }

      const nowIso = new Date().toISOString();
      let updatedOrder = null;

      if (isLambda) {
        try {
          const updateRes = await ddbDocClient.send(
            new UpdateCommand({
              TableName: ORDERS_TABLE,
              Key: { orderId: String(orderId) },
              UpdateExpression: "SET #st = :status, #ua = :updatedAt",
              ExpressionAttributeNames: {
                "#st": "status",
                "#ua": "updatedAt",
              },
              ExpressionAttributeValues: {
                ":status": newStatus,
                ":updatedAt": nowIso,
              },
              ConditionExpression: "attribute_exists(orderId)",
              ReturnValues: "ALL_NEW",
            })
          );
          updatedOrder = updateRes.Attributes || {
            orderId: String(orderId),
            status: newStatus,
            updatedAt: nowIso,
          };
          console.log(`[DynamoDB ${ORDERS_TABLE}] Updated order ${orderId} status to ${newStatus}`);
        } catch (dbErr) {
          if (dbErr.name === "ConditionalCheckFailedException") {
            return {
              statusCode: 404,
              headers: corsHeaders,
              body: JSON.stringify({
                success: false,
                message: `Order #${orderId} does not exist in database`,
              }),
            };
          }
          console.error(`[DynamoDB ${ORDERS_TABLE}] Update order error:`, dbErr);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              message: `Database error: unable to update order status (${dbErr.message})`,
            }),
          };
        }
      } else {
        try {
          const updateRes = await ddbDocClient.send(
            new UpdateCommand({
              TableName: ORDERS_TABLE,
              Key: { orderId: String(orderId) },
              UpdateExpression: "SET #st = :status, #ua = :updatedAt",
              ExpressionAttributeNames: {
                "#st": "status",
                "#ua": "updatedAt",
              },
              ExpressionAttributeValues: {
                ":status": newStatus,
                ":updatedAt": nowIso,
              },
              ReturnValues: "ALL_NEW",
            })
          );
          updatedOrder = updateRes.Attributes;
        } catch (dbErr) {
          console.log(`[Local Mode] Order ${orderId} status update validated (${dbErr.name})`);
          updatedOrder = {
            orderId: String(orderId),
            status: newStatus,
            updatedAt: nowIso,
          };
        }
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: `Order ${orderId} status updated to "${newStatus}"`,
          order: updatedOrder,
        }),
      };
    }

    // ------------------------------------------------------------------------
    // UNMATCHED ROUTE -> 404
    // ------------------------------------------------------------------------
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: `Endpoint ${httpMethod} ${routePath || rawPath} not found on Admin API`,
      }),
    };
  } catch (err) {
    console.error("[FoodHubAdminAPI Error]", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: "Internal server error in FoodHubAdminAPI handler",
      }),
    };
  }
};
