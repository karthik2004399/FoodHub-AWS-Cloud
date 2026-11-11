// FoodHub menu Lambda function (FoodHubGetMenu)
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

export const FALLBACK_MENU = [
  {
    id: 1,
    name: "Margherita Pizza",
    description: "Fresh tomato, mozzarella and basil.",
    price: 299,
    rating: 4.8,
    category: "Pizza",
    available: true,
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    name: "Classic Burger",
    description: "Juicy grilled patty with fresh vegetables.",
    price: 199,
    rating: 4.9,
    category: "Burgers",
    available: true,
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 3,
    name: "Creamy Pasta",
    description: "Creamy pasta with herbs and parmesan.",
    price: 249,
    rating: 4.7,
    category: "Pasta",
    available: true,
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 4,
    name: "Asian Noodles",
    description: "Stir-fried noodles with vegetables.",
    price: 229,
    rating: 4.6,
    category: "Asian",
    available: true,
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 5,
    name: "Chocolate Dessert",
    description: "Rich chocolate dessert with fresh berries.",
    price: 179,
    rating: 4.8,
    category: "Desserts",
    available: true,
    image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 6,
    name: "Fresh Salad",
    description: "Healthy salad with fresh vegetables.",
    price: 159,
    rating: 4.5,
    category: "Healthy",
    available: true,
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
  },
];

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "GET,OPTIONS",
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

  const tableName = process.env.MENU_TABLE_NAME || "FoodHubMenu";

  try {
    const scanResponse = await ddbDocClient.send(
      new ScanCommand({
        TableName: tableName,
      })
    );

    if (scanResponse.Items && scanResponse.Items.length > 0) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: "FoodHub menu retrieved from DynamoDB",
          count: scanResponse.Items.length,
          data: scanResponse.Items,
        }),
      };
    }
  } catch (dbError) {
    console.warn(`[DynamoDB ${tableName}] Scan notice: ${dbError.message} — Returning fallback menu.`);
  }

  // Graceful fallback to default menu if table is empty or pending AWS Console creation
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({
      success: true,
      message: "FoodHub menu retrieved successfully (fallback dataset)",
      count: FALLBACK_MENU.length,
      data: FALLBACK_MENU,
    }),
  };
};
