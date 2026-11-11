function About({ onExploreMenu }) {
  const values = [
    {
      title: "Quality",
      description: "Carefully selected ingredients prepared fresh in our hygienic kitchens.",
      icon: "✨",
    },
    {
      title: "Customer Satisfaction",
      description: "Dedicated to delighting customers with prompt service and delicious meals.",
      icon: "😊",
    },
    {
      title: "Convenience",
      description: "Simple online ordering from any device with real-time updates.",
      icon: "📱",
    },
    {
      title: "Reliability",
      description: "Cloud-powered uptime with transparent order tracking and delivery.",
      icon: "🛡️",
    },
    {
      title: "Freshness",
      description: "Every meal cooked to order and delivered piping hot.",
      icon: "🥗",
    },
  ];

  const highlights = [
    {
      title: "Easy Ordering",
      description: "Intuitive interface designed for swift food selection and ordering.",
    },
    {
      title: "Attractive Menu",
      description: "Diverse collection of popular pizzas, burgers, pastas, Asian bowls, and desserts.",
    },
    {
      title: "Transparent Pricing",
      description: "Clear item prices with zero hidden charges and verified flat delivery rates.",
    },
    {
      title: "Convenient Checkout",
      description: "Streamlined address capture and instant cloud order confirmation.",
    },
    {
      title: "Responsive Customer Experience",
      description: "Fast loading times and high availability backed by global CDN edge locations.",
    },
  ];

  return (
    <div className="bg-orange-50/50 py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        {/* Header */}
        <div className="text-center">
          <p className="font-semibold uppercase tracking-wider text-orange-600">
            About Us
          </p>
          <h1 className="mt-2 text-4xl font-extrabold text-gray-900 md:text-5xl">
            Welcome to <span className="text-orange-600">FoodHub</span>
          </h1>
          <p className="mt-3 text-lg font-medium italic text-orange-700">
            "Fresh Bites, Happy Moments."
          </p>
          <p className="mx-auto mt-4 max-w-2xl text-gray-600 leading-relaxed">
            Discover delicious meals, explore exciting flavours and enjoy convenient food ordering with FoodHub.
          </p>
        </div>

        {/* Our Story */}
        <div className="mt-14 rounded-3xl bg-white p-8 md:p-12 shadow-sm border border-orange-100">
          <div className="grid gap-8 md:grid-cols-2 items-center">
            <div>
              <span className="inline-block rounded-full bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-orange-700">
                Our Story
              </span>
              <h2 className="mt-4 text-3xl font-bold text-gray-900">
                Crafted for Seamless Food Ordering
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                FoodHub is a cloud-based food ordering platform designed from the ground up to make ordering delicious meals convenient, simple, and joyful.
              </p>
              <p className="mt-3 text-gray-600 leading-relaxed">
                By bridging modern digital technology with great culinary recipes, we bring your favorite flavors directly to your doorstep with speed and consistency.
              </p>
              {onExploreMenu && (
                <button
                  type="button"
                  onClick={onExploreMenu}
                  className="mt-6 rounded-full bg-orange-600 px-6 py-2.5 font-semibold text-white shadow-md hover:bg-orange-700 transition"
                >
                  Explore Our Menu
                </button>
              )}
            </div>

            <div className="rounded-2xl overflow-hidden shadow-lg border border-orange-100">
              <img
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=900&q=80"
                alt="FoodHub Kitchen Experience"
                className="h-80 w-full object-cover"
              />
            </div>
          </div>
        </div>

        {/* Mission & Vision */}
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <div className="rounded-3xl bg-white p-8 shadow-sm border border-orange-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
              🎯
            </div>
            <h3 className="mt-5 text-2xl font-bold text-gray-900">Our Mission</h3>
            <p className="mt-3 text-gray-600 leading-relaxed">
              To provide customers with a smooth, convenient, and enjoyable food ordering experience by leveraging cutting-edge cloud architecture, fresh ingredients, and attentive customer service.
            </p>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-sm border border-orange-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-100 text-2xl">
              👁️
            </div>
            <h3 className="mt-5 text-2xl font-bold text-gray-900">Our Vision</h3>
            <p className="mt-3 text-gray-600 leading-relaxed">
              To make quality food accessible to everyone through a reliable digital ordering experience that sets a new standard for modern cloud-based dining.
            </p>
          </div>
        </div>

        {/* Our Values */}
        <div className="mt-14">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">Our Core Values</h2>
            <p className="mt-2 text-gray-600">The principles that guide every order we prepare and deliver</p>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {values.map((val) => (
              <div
                key={val.title}
                className="rounded-2xl bg-white p-6 shadow-sm border border-orange-100 text-center transition hover:-translate-y-1 hover:shadow-md"
              >
                <div className="text-4xl">{val.icon}</div>
                <h4 className="mt-3 text-lg font-bold text-gray-900">{val.title}</h4>
                <p className="mt-2 text-xs text-gray-600 leading-relaxed">{val.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose FoodHub */}
        <div className="mt-14 rounded-3xl bg-gradient-to-br from-orange-600 to-amber-600 p-8 md:p-12 text-white shadow-xl">
          <div className="text-center">
            <span className="rounded-full bg-white/20 px-4 py-1 text-xs font-bold uppercase tracking-wider">
              Why Choose FoodHub?
            </span>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Elevating Your Dining Experience
            </h2>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {highlights.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl bg-white/10 p-6 backdrop-blur-sm border border-white/20"
              >
                <h4 className="text-xl font-bold text-white">{item.title}</h4>
                <p className="mt-2 text-sm text-orange-100 leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default About;
