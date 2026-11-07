// FoodHub order processing Lambda function (FoodHubCreateOrder)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

// Initialize DynamoDB Document Client (reused across warm Lambda invocations)
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "ap-south-1",
});
const ddbDocClient = DynamoDBDocumentClient.from(client);

export const handler = async (event = {}) => {
  // Handle HTTP OPTIONS preflight request
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    // Parse incoming request body (handling potential Base64 encoding)
    let rawBody = event.body;
    if (event.isBase64Encoded && typeof rawBody === "string") {
      rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
    }

    const order = typeof rawBody === "string"
      ? JSON.parse(rawBody)
      : rawBody ?? event;

    const { customer, items } = order || {};

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

    // Server-side authoritative menu prices
    const prices = {
      1: 299, // Margherita Pizza
      2: 199, // Classic Burger
      3: 249, // Creamy Pasta
      4: 229, // Asian Noodles
      5: 179, // Chocolate Dessert
      6: 159, // Fresh Salad
    };

    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const itemId = Number(item.id);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(itemId) || !Number.isInteger(quantity) || quantity <= 0) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "Each item needs a valid ID and positive quantity",
          }),
        };
      }

      const price = prices[itemId];
      if (price === undefined) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: `Invalid food item ID: ${itemId}`,
          }),
        };
      }

      subtotal += price * quantity;
      validatedItems.push({
        id: itemId,
        quantity,
        price,
      });
    }

    const deliveryFee = 40;
    const total = subtotal + deliveryFee;

    // Generate unique order ID
    const orderId = `ORD-${Date.now()}`;
    const createdAt = new Date().toISOString();

    const orderRecord = {
      orderId,
      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address.trim(),
        city: customer.city?.trim() || "",
        pincode: customer.pincode?.trim() || "",
      },
      items: validatedItems,
      subtotal,
      deliveryFee,
      total,
      status: "Placed",
      createdAt,
    };

    // Store in Amazon DynamoDB
    const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
    const tableName = process.env.TABLE_NAME || "FoodHubOrders";

    if (isLambda) {
      try {
        await ddbDocClient.send(
          new PutCommand({
            TableName: tableName,
            Item: orderRecord,
          })
        );
        console.log(`[DynamoDB] Order ${orderId} successfully saved to ${tableName}`);
      } catch (dbError) {
        console.error("[DynamoDB] Error saving order in AWS Lambda:", dbError);
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
        await ddbDocClient.send(
          new PutCommand({
            TableName: tableName,
            Item: orderRecord,
          })
        );
        console.log(`[Local Mode] Order ${orderId} saved to ${tableName}`);
      } catch (dbError) {
        console.log(`[Local Mode] Order ${orderId} validated (DynamoDB write bypassed locally: ${dbError.name})`);
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
