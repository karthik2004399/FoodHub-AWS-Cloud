import { useEffect, useState } from "react";
import FoodCard from "./FoodCard";
import { FALLBACK_MENU } from "../menuData";

const CATEGORIES = [
  "All",
  "Pizza",
  "Burgers",
  "Pasta",
  "Asian",
  "Desserts",
  "Healthy",
];

function Menu({
  onAddToCart,
  selectedCategory: propCategory,
  onSelectCategory,
  isFullPage = false,
}) {
  const [foods, setFoods] = useState(FALLBACK_MENU);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [internalCategory, setInternalCategory] = useState("All");

  const activeCategory = propCategory || internalCategory;

  const apiBaseUrl =
    import.meta.env.VITE_API_BASE_URL ||
    "https://p58iopju3f.execute-api.ap-south-1.amazonaws.com";

  useEffect(() => {
    let isMounted = true;

    const fetchMenu = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${apiBaseUrl}/menu`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Menu API responded with status ${response.status}`);
        }

        const result = await response.json();

        if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
          if (isMounted) {
            setFoods(result.data);
          }
        } else if (Array.isArray(result) && result.length > 0) {
          if (isMounted) {
            setFoods(result);
          }
        } else {
          console.warn("Unexpected API response format, retaining standard menu");
        }
      } catch (err) {
        console.warn("Menu API notice:", err.message, "— Serving static fallback menu.");
        if (isMounted) {
          setFoods(FALLBACK_MENU);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchMenu();

    return () => {
      isMounted = false;
    };
  }, [apiBaseUrl]);

  const handleCategoryClick = (cat) => {
    setInternalCategory(cat);
    if (onSelectCategory) {
      onSelectCategory(cat);
    }
  };

  // Filter foods by category and search query
  const filteredFoods = foods.filter((food) => {
    const matchesCategory =
      !activeCategory ||
      activeCategory === "All" ||
      food.category?.toLowerCase() === activeCategory.toLowerCase();

    const matchesSearch =
      !searchQuery.trim() ||
      food.name?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      food.description?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
      food.category?.toLowerCase().includes(searchQuery.toLowerCase().trim());

    return matchesCategory && matchesSearch;
  });

  return (
    <section
      id="menu"
      className={`px-6 ${isFullPage ? "py-12 md:py-16 bg-orange-50/40 min-h-screen" : "py-16 bg-orange-50"}`}
    >
      <div className="mx-auto max-w-7xl">
        {/* Header Section */}
        <div className="text-center">
          <p className="font-semibold uppercase tracking-wider text-orange-600">
            {isFullPage ? "Complete Restaurant Menu" : "Our Menu"}
          </p>

          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
            {isFullPage ? "Explore FoodHub Delicacies" : "Popular Dishes"}
          </h2>

          <p className="mt-3 text-gray-600 max-w-xl mx-auto">
            Freshly prepared favorites crafted with quality ingredients and delivered straight to your door.
          </p>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="mt-8 space-y-4">
          {/* Search Bar */}
          <div className="mx-auto max-w-md">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-gray-400 text-lg">
                🔍
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search food by name, ingredient, or style..."
                className="w-full rounded-full border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm shadow-sm outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-xs font-bold text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryClick(cat)}
                  className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                    isSelected
                      ? "bg-orange-600 text-white shadow-md shadow-orange-600/20"
                      : "bg-white text-gray-700 border border-gray-200 hover:border-orange-300 hover:text-orange-600"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Indicators */}
        {loading && (
          <div className="mt-12 flex flex-col items-center justify-center text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-600">Loading delicious food from cloud database...</p>
          </div>
        )}

        {error && (
          <p className="mt-10 text-center font-medium text-red-600">
            {error}
          </p>
        )}

        {/* Empty Search / Filter State */}
        {!loading && filteredFoods.length === 0 && (
          <div className="mt-12 rounded-3xl bg-white p-10 text-center shadow-sm border border-orange-100 max-w-lg mx-auto">
            <div className="text-5xl">🍽️</div>
            <h3 className="mt-4 text-xl font-bold text-gray-900">No dishes found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {searchQuery
                ? `No dishes match "${searchQuery}" in category "${activeCategory}".`
                : `No items currently listed under category "${activeCategory}".`}
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                handleCategoryClick("All");
              }}
              className="mt-5 rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Food Grid */}
        {filteredFoods.length > 0 && (
          <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {filteredFoods.map((food) => (
              <FoodCard
                key={food.id || food.itemId}
                food={food}
                onAddToCart={onAddToCart}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default Menu;
