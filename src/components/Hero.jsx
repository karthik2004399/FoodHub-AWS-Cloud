import { useEffect, useState } from "react"

function Hero() {
  const foodImages = [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80",
  ]

  const [currentImage, setCurrentImage] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage(
        (current) => (current + 1) % foodImages.length
      )
    }, 4000)

    return () => clearInterval(timer)
  }, [foodImages.length])

  const nextImage = () => {
    setCurrentImage(
      (current) => (current + 1) % foodImages.length
    )
  }

  const previousImage = () => {
    setCurrentImage(
      (current) =>
        (current - 1 + foodImages.length) %
        foodImages.length
    )
  }

  return (
    <section className="bg-orange-50 px-6 py-16">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">

        <div>
          <p className="mb-4 font-semibold uppercase tracking-wider text-orange-600">
            Fresh & Delicious
          </p>

          <h1 className="text-5xl font-bold leading-tight text-gray-900 md:text-6xl">
            Delicious food,
            <span className="block text-orange-600">
              delivered to you.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-8 text-gray-600">
            Enjoy freshly prepared meals made with quality
            ingredients. Order your favorite food and get it
            delivered right to your door.
          </p>

          <div className="mt-8 flex gap-4">
            <button className="rounded-full bg-orange-600 px-6 py-3 font-semibold text-white shadow-lg hover:bg-orange-700">
              Explore Menu
            </button>

            <button className="rounded-full border border-orange-600 px-6 py-3 font-semibold text-orange-600 hover:bg-orange-100">
              Order Now
            </button>
          </div>
        </div>

        <div className="relative">

          <img
            src={foodImages[currentImage]}
            alt="Delicious restaurant food"
            className="h-[450px] w-full rounded-3xl object-cover shadow-2xl transition-opacity duration-700"
          />

          <button
            onClick={previousImage}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-4 py-2 text-xl shadow-lg hover:bg-white"
          >
            ←
          </button>

          <button
            onClick={nextImage}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 px-4 py-2 text-xl shadow-lg hover:bg-white"
          >
            →
          </button>

          <div className="absolute bottom-6 left-6 rounded-2xl bg-white px-5 py-4 shadow-xl">
            <p className="text-sm text-gray-500">
              ⭐ Customer Rating
            </p>

            <p className="text-xl font-bold text-gray-900">
              4.9 / 5
            </p>
          </div>

          <div className="absolute bottom-6 right-6 flex gap-2">
            {foodImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(index)}
                className={`h-3 w-3 rounded-full ${
                  currentImage === index
                    ? "bg-orange-600"
                    : "bg-white"
                }`}
              />
            ))}
          </div>

        </div>

      </div>
    </section>
  )
}

export default Hero