export function WhyChooseUs({ onOrderNow }) {
  const points = [
    {
      icon: "⚡",
      title: "Easy Ordering",
      description: "Browse curated dishes, customize your meal, and order in under two minutes.",
    },
    {
      icon: "🍱",
      title: "Attractive Menu",
      description: "From oven-baked pizzas to fresh bowls and gourmet desserts.",
    },
    {
      icon: "🏷️",
      title: "Transparent Pricing",
      description: "Direct server-validated prices with flat ₹40 delivery fee and no hidden charges.",
    },
    {
      icon: "💳",
      title: "Convenient Checkout",
      description: "Simple delivery address capture and instantaneous order confirmation.",
    },
    {
      icon: "🚀",
      title: "Responsive Customer Experience",
      description: "Powered by AWS CloudFront and Lambda for ultra-fast, 99.9% reliable uptime.",
    },
  ];

  return (
    <section className="bg-white px-6 py-16 border-t border-orange-100">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="font-semibold uppercase tracking-wider text-orange-600">
            Why Choose Us
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
            Why Diners Love FoodHub
          </h2>
          <p className="mt-3 text-gray-600 max-w-2xl mx-auto">
            We focus on flavor, hygiene, and rapid delivery powered by modern cloud technology.
          </p>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {points.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-orange-100 bg-orange-50/60 p-7 transition duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-600 text-2xl text-white shadow-md">
                {p.icon}
              </div>
              <h3 className="mt-5 text-xl font-bold text-gray-900">{p.title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">{p.description}</p>
            </div>
          ))}

          {/* Callout Card */}
          <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 p-7 text-white shadow-lg">
            <div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider">
                Special Offer
              </span>
              <h3 className="mt-4 text-2xl font-bold">Ready to Taste the Difference?</h3>
              <p className="mt-2 text-sm text-orange-100">
                Join thousands of foodies ordering everyday comfort meals.
              </p>
            </div>
            {onOrderNow && (
              <button
                type="button"
                onClick={onOrderNow}
                className="mt-6 rounded-full bg-white px-6 py-3 text-sm font-bold text-orange-600 shadow-md hover:bg-orange-50 transition text-center"
              >
                Order Your Meal Now →
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function Testimonials() {
  const reviews = [
    {
      name: "Ananya Sharma",
      role: "Regular Customer",
      rating: 5,
      comment:
        "The Margherita Pizza arrived piping hot within 25 minutes! The crust was crispy and the cheese tasted authentically fresh.",
    },
    {
      name: "Rohit Patel",
      role: "Food Enthusiast",
      rating: 5,
      comment:
        "Loved the smooth ordering interface. Tracking and placing an order takes seconds, and the Classic Burger was packed with flavour.",
    },
    {
      name: "Pooja Verma",
      role: "Verified Diner",
      rating: 5,
      comment:
        "Great transparent pricing with no surprise taxes at checkout. Asian Noodles and Chocolate Dessert are my weekend favourites!",
    },
  ];

  return (
    <section className="bg-orange-50/60 px-6 py-16 border-t border-orange-100">
      <div className="mx-auto max-w-7xl">
        <div className="text-center">
          <p className="font-semibold uppercase tracking-wider text-orange-600">
            Reviews
          </p>
          <h2 className="mt-2 text-3xl font-extrabold text-gray-900 md:text-4xl">
            Customer Testimonials
          </h2>
          <p className="mt-3 text-gray-600 max-w-xl mx-auto">
            Real feedback from diners who order with FoodHub daily.
          </p>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {reviews.map((rev) => (
            <div
              key={rev.name}
              className="flex flex-col justify-between rounded-2xl bg-white p-7 shadow-sm border border-orange-100 transition hover:shadow-md"
            >
              <div>
                <div className="flex text-amber-500 text-lg">
                  {"★".repeat(rev.rating)}
                </div>
                <p className="mt-4 text-sm text-gray-600 italic leading-relaxed">
                  "{rev.comment}"
                </p>
              </div>

              <div className="mt-6 flex items-center gap-3 pt-4 border-t border-gray-100">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-sm font-bold text-orange-700">
                  {rev.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{rev.name}</h4>
                  <p className="text-xs text-gray-400">{rev.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
