import { useEffect, useState } from "react"
import FoodCard from "./FoodCard"
import { FALLBACK_MENU } from "../menuData"

// Static fallback menu data matching backend/menu.mjs
// Ensures all dishes render on CloudFront even if AWS API Gateway /menu route is pending deployment


function Menu({ onAddToCart, selectedCategory = "All" }) {
  const [foods, setFoods] = useState(FALLBACK_MENU)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    "https://p58iopju3f.execute-api.ap-south-1.amazonaws.com"

  useEffect(() => {
    let isMounted = true

    const fetchMenu = async () => {
      try {
        setLoading(true)
        setError("")

        const response = await fetch(`${apiBaseUrl}/menu`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Menu API responded with status ${response.status}`)
        }

        const result = await response.json()

        if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
          if (isMounted) {
            setFoods(result.data)
          }
        } else if (Array.isArray(result) && result.length > 0) {
          if (isMounted) {
            setFoods(result)
          }
        } else {
          // If response format is not as expected, retain fallback
          console.warn("Unexpected API response format, using default menu items")
        }
      } catch (err) {
        console.warn("Menu API call note:", err.message, "— Serving static menu data.")
        // Keep fallback menu loaded so customers always see the dishes
        if (isMounted) {
          setFoods(FALLBACK_MENU)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchMenu()

    return () => {
      isMounted = false
    }
  }, [apiBaseUrl])

  // Filter foods by selected category
  const filteredFoods =
    selectedCategory && selectedCategory !== "All"
      ? foods.filter(
          (food) =>
            food.category?.toLowerCase() === selectedCategory.toLowerCase()
        )
      : foods

  return (
    <section
      id="menu"
      className="bg-orange-50 px-6 py-16"
    >
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="font-semibold uppercase tracking-wider text-orange-600">
            Our Menu
          </p>

          <h2 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">
            Popular Dishes
          </h2>

          <p className="mt-3 text-gray-500">
            Freshly prepared favorites from our kitchen
            {selectedCategory && selectedCategory !== "All" && (
              <span className="font-medium text-orange-600">
                {" "}• Filtered by: {selectedCategory}
              </span>
            )}
          </p>
        </div>

        {loading && (
          <p className="mt-10 text-center text-gray-600">
            Loading delicious food...
          </p>
        )}

        {error && (
          <p className="mt-10 text-center text-red-600">
            {error}
          </p>
        )}

        {!loading && filteredFoods.length === 0 && (
          <div className="mt-10 text-center text-gray-600">
            <p className="text-lg">No dishes found in category "{selectedCategory}".</p>
            <p className="mt-2 text-sm text-gray-500">Please choose another category or click "All".</p>
          </div>
        )}

        {filteredFoods.length > 0 && (
          <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFoods.map((food) => (
              <FoodCard
                key={food.id}
                food={food}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export default Menu
