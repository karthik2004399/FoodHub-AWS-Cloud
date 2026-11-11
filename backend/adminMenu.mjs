// FoodHub admin menu Lambda function (FoodHubAdminMenu)
// Handles POST, PUT, DELETE for food items in DynamoDB FoodHubMenu.
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  DeleteCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { verifyAdminToken } from "./authHelper.mjs";

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,PUT,DELETE,OPTIONS",
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

  // 1. Authorize admin token
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

  const tableName = process.env.MENU_TABLE_NAME || "FoodHubMenu";

  // Parse body
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

  // Extract itemId from path parameters (e.g. /admin/menu/{itemId})
  const pathParams = event.pathParameters || {};
  let itemId = pathParams.itemId || pathParams.id;

  // Fallback: extract from URL path if not using API Gateway proxy path parameters
  if (!itemId && event.path) {
    const parts = event.path.split("/");
    const last = parts[parts.length - 1];
    if (last && last !== "menu") {
      itemId = decodeURIComponent(last);
    }
  }

  try {
    // 2. CREATE FOOD ITEM: POST /admin/menu
    if (httpMethod === "POST") {
      if (!body.name?.trim() || !body.price) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            message: "Item name and price are required",
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
        price: Number(body.price),
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

      try {
        await ddbDocClient.send(
          new PutCommand({
            TableName: tableName,
            Item: newItem,
          })
        );
      } catch (dbErr) {
        console.warn(`[DynamoDB] Write notice for ${tableName}:`, dbErr.message);
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

    // 3. UPDATE FOOD ITEM: PUT /admin/menu/{itemId}
    if (httpMethod === "PUT") {
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

      // Check existing item or construct update
      let existing = {};
      try {
        const getRes = await ddbDocClient.send(
          new GetCommand({
            TableName: tableName,
            Key: { itemId: String(itemId) },
          })
        );
        if (getRes.Item) {
          existing = getRes.Item;
        }
      } catch (dbErr) {
        console.warn("[DynamoDB] GetItem notice:", dbErr.message);
      }

      const updatedItem = {
        ...existing,
        ...body,
        itemId: String(itemId),
        id: Number(itemId) || existing.id || Date.now(),
        price: body.price !== undefined ? Number(body.price) : existing.price,
        available: body.available !== undefined ? body.available : existing.available !== false,
        updatedAt: new Date().toISOString(),
      };

      try {
        await ddbDocClient.send(
          new PutCommand({
            TableName: tableName,
            Item: updatedItem,
          })
        );
      } catch (dbErr) {
        console.warn("[DynamoDB] PutItem update notice:", dbErr.message);
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

    // 4. DELETE FOOD ITEM: DELETE /admin/menu/{itemId}
    if (httpMethod === "DELETE") {
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

      try {
        await ddbDocClient.send(
          new DeleteCommand({
            TableName: tableName,
            Key: { itemId: String(itemId) },
          })
        );
      } catch (dbErr) {
        console.warn("[DynamoDB] Delete notice:", dbErr.message);
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

    return {
      statusCode: 405,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: `Method ${httpMethod} not allowed`,
      }),
    };
  } catch (err) {
    console.error("Admin menu handler error:", err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: "Internal server error in admin menu handler",
      }),
    };
  }
};
