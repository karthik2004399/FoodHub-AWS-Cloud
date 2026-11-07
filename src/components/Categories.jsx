function Categories({ selectedCategory = "All", onSelectCategory }) {
  const categories = [
    { name: "All", icon: "🍽️" },
    { name: "Pizza", icon: "🍕" },
    { name: "Burgers", icon: "🍔" },
    { name: "Pasta", icon: "🍝" },
    { name: "Asian", icon: "🍜" },
    { name: "Desserts", icon: "🍰" },
    { name: "Healthy", icon: "🥗" },
  ]

  const handleCategoryClick = (categoryName) => {
    if (onSelectCategory) {
      onSelectCategory(categoryName)
    }

    // Smooth scroll to the menu section
    const menuSection = document.getElementById("menu")
    if (menuSection) {
      menuSection.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <section className="bg-white px-6 py-16">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="font-semibold uppercase tracking-wider text-orange-600">
            Explore
          </p>

          <h2 className="mt-2 text-3xl font-bold text-gray-900 md:text-4xl">
            What are you craving?
          </h2>

          <p className="mt-3 text-gray-500">
            Choose from our popular food categories
          </p>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-7">
          {categories.map((category) => {
            const isSelected = selectedCategory === category.name

            return (
              <button
                key={category.name}
                type="button"
                onClick={() => handleCategoryClick(category.name)}
                className={`group rounded-2xl border p-5 text-center transition duration-300 hover:-translate-y-1 hover:shadow-lg ${
                  isSelected
                    ? "border-orange-600 bg-orange-600 text-white shadow-md ring-2 ring-orange-400"
                    : "border-orange-100 bg-orange-50 text-gray-800 hover:bg-orange-600 hover:text-white"
                }`}
              >
                <div className="text-4xl transition group-hover:scale-110">
                  {category.icon}
                </div>

                <p
                  className={`mt-3 font-semibold ${
                    isSelected ? "text-white" : "text-gray-800 group-hover:text-white"
                  }`}
                >
                  {category.name}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default Categories
