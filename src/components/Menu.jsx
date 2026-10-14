import { useEffect, useState } from "react"
import FoodCard from "./FoodCard"

function Menu({ onAddToCart }) {
  const [foods, setFoods] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const response = await fetch(
          "http://localhost:3000/api/menu"
        )

        if (!response.ok) {
          throw new Error("Failed to fetch the menu")
        }

        const result = await response.json()

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error("Invalid menu response")
        }

        setFoods(result.data)
      } catch (err) {
        console.error("Menu loading error:", err)
        setError(
          "Unable to load the menu. Please check that the backend is running."
        )
      } finally {
        setLoading(false)
      }
    }

    fetchMenu()
  }, [])

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

        {!loading && !error && foods.length === 0 && (
          <p className="mt-10 text-center text-gray-600">
            No food items are available right now.
          </p>
        )}

        {!loading && !error && foods.length > 0 && (
          <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {foods.map((food) => (
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