// FoodHub order processing & retrieval Lambda function (FoodHubCreateOrder)
// Supports:
//   - POST /orders : Validates items/prices server-side, attaches Cognito user sub as customerId, saves to FoodHubOrders
//   - GET  /orders : Authenticates customer via Cognito and queries customer's own orders via GSI (no full-table scan)
import crypto from "node:crypto";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  ScanCommand,
} from "@aws-sdk/lib-dynamodb";
import { FALLBACK_MENU } from "./menu.mjs";
import { verifyCognitoUser } from "./authHelper.mjs";

const ALLOWED_PAYMENT_METHODS = [
  "Cash on Delivery",
  "UPI",
  "Credit / Debit Card",
  "Net Banking",
];

const DELIVERY_FEE = 40;
export const DEFAULT_ORDERS_CUSTOMER_INDEX = "customerId-createdAt-index";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

// Initialize DynamoDB Document Client (reused across warm Lambda invocations)
const defaultClient = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
});
const defaultDdbDocClient = DynamoDBDocumentClient.from(defaultClient);

function normalizeItemId(rawId) {
  const num = Number(rawId);
  return Number.isFinite(num) && String(num) === rawId ? num : rawId;
}

function normalizeOrdersPath(event = {}) {
  const raw =
    event.rawPath ||
    event.path ||
    event.requestContext?.http?.path ||
    "";
  let cleaned = String(raw).replace(/\/+$/, "");
  const ordersIdx = cleaned.indexOf("/orders");
  if (ordersIdx !== -1) {
    cleaned = cleaned.slice(ordersIdx);
  }
  return cleaned;
}

export function createOrderHandler({
  ddbClient = defaultDdbDocClient,
  isMockedDb = ddbClient !== defaultDdbDocClient,
  jwksProvider,
} = {}) {
  return async function handler(event = {}) {
    const httpMethod = (
      event.httpMethod ||
      event.requestContext?.http?.method ||
      "POST"
    ).toUpperCase();

    // 1. Handle HTTP OPTIONS preflight request
    if (httpMethod === "OPTIONS") {
      return {
        statusCode: 204,
        headers: corsHeaders,
        body: "",
      };
    }

    const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
    const tableName =
      process.env.TABLE_NAME || process.env.ORDERS_TABLE_NAME || "FoodHubOrders";
    const indexName =
      process.env.ORDERS_CUSTOMER_INDEX || DEFAULT_ORDERS_CUSTOMER_INDEX;

    // 2. ROUTE: GET /orders (Authenticated customer's own orders via GSI query)
    if (httpMethod === "GET") {
      const routePath = normalizeOrdersPath(event);
      const pathParams = event.pathParameters || {};

      // Never allow targeting another customer or order ID via URL path segments
      if (
        (routePath && routePath !== "/orders") ||
        Object.keys(pathParams).length > 0
      ) {
        return {
          statusCode: 403,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message:
              "Forbidden: customer orders are strictly scoped to the authenticated user.",
          }),
        };
      }

      const auth = await verifyCognitoUser(event, { jwksProvider });
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

      const customerId = auth.sub;

      try {
        const queryRes = await ddbClient.send(
          new QueryCommand({
            TableName: tableName,
            IndexName: indexName,
            KeyConditionExpression: "customerId = :customerId",
            ExpressionAttributeValues: {
              ":customerId": customerId,
            },
            ScanIndexForward: false,
          })
        );

        // Enforce strict ownership defense-in-depth and deterministic newest-first order
        const customerOrders = (queryRes.Items || [])
          .filter((order) => order.customerId === customerId)
          .sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
          });

        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            count: customerOrders.length,
            orders: customerOrders,
          }),
        };
      } catch (dbErr) {
        if (!isLambda && !isMockedDb && dbErr?.name === "CredentialsProviderError") {
          console.log(
            `[Local Mode] GET /orders bypassed DynamoDB query without AWS credentials (${dbErr.name})`
          );
          return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
              success: true,
              count: 0,
              orders: [],
            }),
          };
        }

        console.error(
          `[DynamoDB ${tableName}/${indexName}] Query error for customer orders:`,
          dbErr
        );
        return {
          statusCode: 500,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "Database error: unable to retrieve your orders. Please try again.",
          }),
        };
      }
    }

    if (httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: `Method ${httpMethod} not allowed on /orders`,
        }),
      };
    }

    // 3. ROUTE: POST /orders (Create Order)
    try {
      // Check Cognito identity if provided; reject tampered/invalid tokens
      const auth = await verifyCognitoUser(event, { jwksProvider });
      if (!auth.authorized && !auth.missingHeader) {
        return {
          statusCode: auth.statusCode,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: auth.message,
          }),
        };
      }

      // Derive customerId strictly from authenticated Cognito sub (ignore client body.customerId)
      const authenticatedCustomerId = auth.authorized ? auth.sub : null;

      // Parse incoming request body
      let rawBody = event.body;
      if (event.isBase64Encoded && typeof rawBody === "string") {
        rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
      }

      const order =
        typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody ?? event;

      const { customer, items, paymentMethod: rawPaymentMethod } = order || {};

      // Validate customer delivery details
      if (
        !customer ||
        !customer.name?.trim() ||
        !customer.phone?.trim() ||
        !customer.address?.trim()
      ) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "Customer name, phone, and address are required",
          }),
        };
      }

      // Validate phone number format (10 digits)
      if (!/^\d{10}$/.test(customer.phone.trim())) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "Please enter a valid 10-digit phone number",
          }),
        };
      }

      // Validate pincode format (6 digits) when provided
      const trimmedPincode =
        customer.pincode !== undefined ? String(customer.pincode).trim() : "";
      if (trimmedPincode && !/^\d{6}$/.test(trimmedPincode)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "Please enter a valid 6-digit pincode",
          }),
        };
      }

      // Validate payment method (defaults to Cash on Delivery for backward compatibility)
      const paymentMethod = rawPaymentMethod
        ? String(rawPaymentMethod).trim()
        : "Cash on Delivery";
      if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: `Invalid payment method. Must be one of: ${ALLOWED_PAYMENT_METHODS.join(", ")}`,
          }),
        };
      }

      // Validate ordered items array
      if (!Array.isArray(items) || items.length === 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "Please add at least one food item",
          }),
        };
      }

      // Fetch authoritative menu map from DynamoDB FoodHubMenu (with fallback)
      const menuTable = process.env.MENU_TABLE_NAME || "FoodHubMenu";
      const itemCatalog = new Map();

      // Populate fallback map first
      for (const f of FALLBACK_MENU) {
        const entry = {
          price: Number(f.price),
          name: f.name,
          image: f.image || "",
          available: f.available !== false,
        };
        if (f.id !== undefined && f.id !== null) {
          itemCatalog.set(String(f.id), entry);
        }
        if (f.itemId !== undefined && f.itemId !== null) {
          itemCatalog.set(String(f.itemId), entry);
        }
      }

      try {
        const scanRes = await ddbClient.send(
          new ScanCommand({
            TableName: menuTable,
          })
        );
        if (scanRes.Items && scanRes.Items.length > 0) {
          for (const item of scanRes.Items) {
            const entry = {
              price: Number(item.price),
              name: item.name,
              image: item.image || item.imageUrl || "",
              available: item.available !== false,
            };
            if (item.itemId !== undefined && item.itemId !== null) {
              itemCatalog.set(String(item.itemId), entry);
            }
            if (item.id !== undefined && item.id !== null) {
              itemCatalog.set(String(item.id), entry);
            }
          }
        }
      } catch (dbErr) {
        console.warn(`[DynamoDB ${menuTable}] Menu scan notice: ${dbErr.message}`);
      }

      let subtotal = 0;
      const validatedItems = [];

      for (const item of items) {
        const rawKey = item?.itemId ?? item?.id;
        const rawId =
          rawKey !== undefined && rawKey !== null ? String(rawKey).trim() : "";
        const quantity = Number(item?.quantity);

        if (!rawId || !Number.isInteger(quantity) || quantity <= 0 || quantity > 99) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              message: "Each item needs a valid ID and positive integer quantity",
            }),
          };
        }

        const catalogItem = itemCatalog.get(rawId);
        if (!catalogItem) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              message: `Food item #${rawId} not found in catalog`,
            }),
          };
        }

        if (!catalogItem.available) {
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              message: `Item "${catalogItem.name}" is currently sold out and unavailable for order`,
            }),
          };
        }

        // Compute item total strictly from authoritative catalog price (ignore any client price)
        const itemTotal = catalogItem.price * quantity;
        subtotal += itemTotal;
        validatedItems.push({
          id: normalizeItemId(rawId),
          name: catalogItem.name,
          image: catalogItem.image,
          quantity,
          price: catalogItem.price,
          itemTotal,
        });
      }

      const deliveryFee = DELIVERY_FEE;
      const total = subtotal + deliveryFee;

      // Generate collision-resistant unique order ID
      const uniqueSuffix = crypto.randomBytes(2).toString("hex").toUpperCase();
      const orderId = `ORD-${Date.now()}-${uniqueSuffix}`;
      const createdAt = new Date().toISOString();

      const orderRecord = {
        orderId,
        ...(authenticatedCustomerId ? { customerId: authenticatedCustomerId } : {}),
        customer: {
          name: customer.name.trim(),
          phone: customer.phone.trim(),
          address: customer.address.trim(),
          city: customer.city?.trim() || "",
          pincode: trimmedPincode,
        },
        paymentMethod,
        items: validatedItems,
        subtotal,
        deliveryFee,
        total,
        status: "Pending",
        createdAt,
      };

      if (isLambda || isMockedDb) {
        try {
          await ddbClient.send(
            new PutCommand({
              TableName: tableName,
              Item: orderRecord,
            })
          );
          console.log(`[DynamoDB] Order ${orderId} successfully saved to ${tableName}`);
        } catch (dbError) {
          console.error("[DynamoDB] Error saving order:", dbError);
          return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
              success: false,
              message: "Database error: unable to save order. Please try again.",
            }),
          };
        }
      } else {
        // Local development test mode
        try {
          await ddbClient.send(
            new PutCommand({
              TableName: tableName,
              Item: orderRecord,
            })
          );
          console.log(`[Local Mode] Order ${orderId} saved to ${tableName}`);
        } catch (dbError) {
          console.log(
            `[Local Mode] Order ${orderId} validated (DynamoDB write bypassed locally: ${dbError.name})`
          );
        }
      }

      return {
        statusCode: 201,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: "FoodHub order processed successfully",
          order: orderRecord,
        }),
      };
    } catch (error) {
      console.error("Order processing error:", error);
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: "Invalid request data",
        }),
      };
    }
  };
}

export const handler = createOrderHandler();
