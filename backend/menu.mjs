// FoodHub menu Lambda function

const menu = [
  {
    id: 1,
    name: "Margherita Pizza",
    description: "Fresh tomato, mozzarella and basil.",
    price: 299,
    rating: 4.8,
    category: "Pizza",
    image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    name: "Classic Burger",
    description: "Juicy grilled patty with fresh vegetables.",
    price: 199,
    rating: 4.9,
    category: "Burgers",
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 3,
    name: "Creamy Pasta",
    description: "Creamy pasta with herbs and parmesan.",
    price: 249,
    rating: 4.7,
    category: "Pasta",
    image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 4,
    name: "Asian Noodles",
    description: "Stir-fried noodles with vegetables.",
    price: 229,
    rating: 4.6,
    category: "Asian",
    image: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 5,
    name: "Chocolate Dessert",
    description: "Rich chocolate dessert with fresh berries.",
    price: 179,
    rating: 4.8,
    category: "Desserts",
    image: "https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 6,
    name: "Fresh Salad",
    description: "Healthy salad with fresh vegetables.",
    price: 159,
    rating: 4.5,
    category: "Healthy",
    image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80",
  },
];

// Lambda handler
export const handler = async () => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      success: true,
      message: "FoodHub menu retrieved successfully",
      count: menu.length,
      data: menu,
    }),
  };
};