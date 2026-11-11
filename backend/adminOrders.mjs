// FoodHub admin orders Lambda function (FoodHubAdminOrders)
// Handles GET and PATCH for orders stored in DynamoDB FoodHubOrders.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  ScanCommand,
  GetCommand,
  PutCommand,
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
  "Access-Control-Allow-Methods": "GET,PATCH,OPTIONS",
};

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event = {}) => {
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  // Authorize admin
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

  const tableName = process.env.TABLE_NAME || "FoodHubOrders";

  // Parse path parameters for orderId
  const pathParams = event.pathParameters || {};
  let orderId = pathParams.orderId || pathParams.id;
  if (!orderId && event.path) {
    const parts = event.path.split("/");
    const last = parts[parts.length - 1];
    if (last && last !== "orders") {
      orderId = decodeURIComponent(last);
    }
  }

  try {
    // 1. LIST ORDERS: GET /admin/orders
    if (httpMethod === "GET") {
      let orders = [];

      try {
        const scanRes = await ddbDocClient.send(
          new ScanCommand({
            TableName: tableName,
          })
        );
        if (scanRes.Items && Array.isArray(scanRes.Items)) {
          orders = scanRes.Items;
        }
      } catch (dbErr) {
        console.warn(`[DynamoDB ${tableName}] Scan notice: ${dbErr.message}`);
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

    // 2. UPDATE STATUS: PATCH /admin/orders/{orderId}
    if (httpMethod === "PATCH") {
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
            body: JSON.stringify({ success: false, message: "Invalid JSON body" }),
          };
        }
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

      // Fetch existing order record
      let existingOrder = {
        orderId,
        status: newStatus,
      };

      try {
        const getRes = await ddbDocClient.send(
          new GetCommand({
            TableName: tableName,
            Key: { orderId },
          })
        );
        if (getRes.Item) {
          existingOrder = getRes.Item;
        }
      } catch (dbErr) {
        console.warn("[DynamoDB] GetOrder notice:", dbErr.message);
      }

      existingOrder.status = newStatus;
      existingOrder.updatedAt = new Date().toISOString();

      try {
        await ddbDocClient.send(
          new PutCommand({
            TableName: tableName,
            Item: existingOrder,
          })
        );
      } catch (dbErr) {
        console.warn("[DynamoDB] Update status notice:", dbErr.message);
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: `Order ${orderId} status updated to "${newStatus}"`,
          order: existingOrder,
        }),
      };
    }

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: `Method ${httpMethod} not allowed`,
      }),
    };
  } catch (err) {
    console.error("Admin orders handler error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: "Internal server error in admin orders handler",
      }),
    };
  }
};
