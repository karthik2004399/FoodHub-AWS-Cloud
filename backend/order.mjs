// FoodHub order processing Lambda function

export const handler = async (event) => {
  try {
    // Read the incoming request
    const order = typeof event.body === "string"
      ? JSON.parse(event.body)
      : event.body ?? event

    const { customer, items } = order

    // Validate customer information
    if (
      !customer ||
      !customer.name ||
      !customer.phone ||
      !customer.address
    ) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "Customer name, phone, and address are required",
        }),
      }
    }

    // Validate ordered items
    if (!Array.isArray(items) || items.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          message: "Please add at least one food item",
        }),
      }
    }

    // Calculate subtotal after validating each item
    let subtotal = 0

    for (const item of items) {
      if (
        !Number.isInteger(item.id) ||
        !Number.isInteger(item.quantity) ||
        item.quantity <= 0
      ) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            message: "Each item needs a valid ID and positive quantity",
          }),
        }
      }

      // Use server-controlled prices, not prices supplied by customers.
      // These sample prices will later come from DynamoDB.
      const prices = {
        1: 299,
        2: 199,
        3: 249,
        4: 229,
        5: 179,
        6: 159,
      }

      const price = prices[item.id]

      if (price === undefined) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            success: false,
            message: `Invalid food item ID: ${item.id}`,
          }),
        }
      }

      subtotal += price * item.quantity
    }

    const deliveryFee = 40
    const total = subtotal + deliveryFee

    // Generate a temporary order ID
    const orderId = `ORD-${Date.now()}`

    return {
      statusCode: 201,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: true,
        message: "FoodHub order processed successfully",
        order: {
          orderId,
          customer,
          items,
          subtotal,
          deliveryFee,
          total,
          status: "Placed",
          createdAt: new Date().toISOString(),
        },
      }),
    }
  } catch (error) {
    return {
      statusCode: 400,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        success: false,
        message: "Invalid request data",
      }),
    }
  }
}