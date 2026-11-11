// FoodHub contact inquiry Lambda function (FoodHubContact)
// Handles customer inquiries submitted through the Contact Us page.

const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

export const handler = async (event = {}) => {
  const httpMethod = event.httpMethod || event.requestContext?.http?.method;
  if (httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: "",
    };
  }

  try {
    let rawBody = event.body;
    if (event.isBase64Encoded && typeof rawBody === "string") {
      rawBody = Buffer.from(rawBody, "base64").toString("utf-8");
    }

    const payload = typeof rawBody === "string" ? JSON.parse(rawBody) : rawBody ?? event;
    const { name, email, phone, subject, message } = payload || {};

    if (!name?.trim() || !email?.trim() || !phone?.trim() || !subject?.trim() || !message?.trim()) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: "All fields (name, email, phone, subject, message) are required",
        }),
      };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: "Please provide a valid email address",
        }),
      };
    }

    if (!/^\d{10}$/.test(phone.trim())) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          message: "Please enter a valid 10-digit phone number",
        }),
      };
    }

    const inquiryId = `INQ-${Date.now()}`;
    console.log(`[Contact] Inquiry ${inquiryId} received from ${name.trim()} (${email.trim()})`);

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        success: true,
        message: "Thank you for reaching out! Your inquiry has been logged, and our FoodHub support team will reply within 24 hours.",
        inquiryId,
      }),
    };
  } catch (err) {
    console.error("Contact handler error:", err);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        message: "Invalid request payload",
      }),
    };
  }
};
