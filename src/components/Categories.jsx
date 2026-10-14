function Categories() {
  const categories = [
    { name: "Pizza", icon: "🍕" },
    { name: "Burgers", icon: "🍔" },
    { name: "Pasta", icon: "🍝" },
    { name: "Asian", icon: "🍜" },
    { name: "Desserts", icon: "🍰" },
    { name: "Drinks", icon: "🥤" },
  ]

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

        <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-6">
          {categories.map((category) => (
            <button
              key={category.name}
              className="group rounded-2xl border border-orange-100 bg-orange-50 p-6 text-center transition duration-300 hover:-translate-y-1 hover:bg-orange-600 hover:shadow-lg"
            >
              <div className="text-5xl transition group-hover:scale-110">
                {category.icon}
              </div>

              <p className="mt-4 font-semibold text-gray-800 group-hover:text-white">
                {category.name}
              </p>
            </button>
          ))}
        </div>

      </div>
    </section>
  )
}

export default Categories