function FoodCard({ food, onAddToCart }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl">

      <img
        src={food.image}
        alt={food.name}
        className="h-56 w-full object-cover"
      />

      <div className="p-5">

        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-bold text-gray-900">
            {food.name}
          </h3>

          <span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-600">
            ⭐ {food.rating}
          </span>
        </div>

        <p className="mt-2 text-sm leading-6 text-gray-500">
          {food.description}
        </p>

        <div className="mt-5 flex items-center justify-between">

          <span className="text-2xl font-bold text-orange-600">
            ₹{food.price}
          </span>

          <button
            onClick={() => onAddToCart(food)}
            className="rounded-full bg-orange-600 px-5 py-2 font-semibold text-white hover:bg-orange-700"
          >
            Add to Cart
          </button>

        </div>

      </div>
    </div>
  )
}

export default FoodCard