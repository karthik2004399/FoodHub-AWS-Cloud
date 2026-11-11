function FoodCard({ food, onAddToCart }) {
  const isAvailable = food.available !== false;
  const imageSrc =
    food.image ||
    food.imageUrl ||
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80";

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl bg-white shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl border border-orange-50">
      <div className="relative h-56 w-full overflow-hidden bg-gray-100">
        <img
          src={imageSrc}
          alt={food.name}
          className={`h-full w-full object-cover transition duration-300 ${
            !isAvailable ? "grayscale opacity-75" : "hover:scale-105"
          }`}
        />

        {/* Category Pill */}
        {food.category && (
          <span className="absolute left-3 top-3 rounded-full bg-black/60 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-white">
            {food.category}
          </span>
        )}

        {/* Availability Badge */}
        <span
          className={`absolute right-3 top-3 rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
            isAvailable
              ? "bg-green-600 text-white"
              : "bg-red-600 text-white"
          }`}
        >
          {isAvailable ? "In Stock" : "Sold Out"}
        </span>
      </div>

      <div className="flex flex-1 flex-col justify-between p-5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-xl font-bold text-gray-900 leading-snug">
              {food.name}
            </h3>

            {food.rating && (
              <span className="shrink-0 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-bold text-orange-700">
                ⭐ {food.rating}
              </span>
            )}
          </div>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {food.description}
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between pt-3 border-t border-gray-100">
          <span className="text-2xl font-bold text-orange-600">
            ₹{food.price}
          </span>

          <button
            type="button"
            disabled={!isAvailable}
            onClick={() => isAvailable && onAddToCart && onAddToCart(food)}
            className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
              isAvailable
                ? "bg-orange-600 text-white shadow-md hover:bg-orange-700"
                : "bg-gray-200 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isAvailable ? "Add to Cart" : "Out of Stock"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FoodCard;
