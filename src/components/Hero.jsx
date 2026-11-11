import { useEffect, useState } from "react";

function Hero({ onExploreMenu, onOrderNow }) {
  const foodImages = [
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=900&q=80",
    "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80",
  ];

  const [currentImage, setCurrentImage] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImage((current) => (current + 1) % foodImages.length);
    }, 4000);

    return () => clearInterval(timer);
  }, [foodImages.length]);

  const nextImage = () => {
    setCurrentImage((current) => (current + 1) % foodImages.length);
  };

  const previousImage = () => {
    setCurrentImage(
      (current) => (current - 1 + foodImages.length) % foodImages.length
    );
  };

  const handleExplore = () => {
    if (onExploreMenu) {
      onExploreMenu();
    } else {
      const menuSection = document.getElementById("menu");
      if (menuSection) {
        menuSection.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleOrder = () => {
    if (onOrderNow) {
      onOrderNow();
    } else {
      handleExplore();
    }
  };

  return (
    <section className="bg-orange-50 px-6 py-14 md:py-20 border-b border-orange-100">
      <div className="mx-auto grid max-w-7xl items-center gap-12 md:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-orange-700">
            <span>🔥</span> Fresh & Delicious Daily
          </div>

          <h1 className="mt-5 text-5xl font-black leading-tight text-gray-900 md:text-6xl">
            Delicious food,
            <span className="block text-orange-600">
              delivered to you.
            </span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-gray-600">
            Enjoy freshly prepared meals made with quality ingredients. Order your favorite food and get it delivered right to your door with real-time cloud tracking.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={handleExplore}
              className="rounded-full bg-orange-600 px-7 py-3.5 font-bold text-white shadow-lg shadow-orange-600/30 hover:bg-orange-700 transition"
            >
              Explore Menu
            </button>

            <button
              type="button"
              onClick={handleOrder}
              className="rounded-full border-2 border-orange-600 px-7 py-3.5 font-bold text-orange-600 hover:bg-orange-100 transition"
            >
              Order Now
            </button>
          </div>

          {/* Highlights Mini-strip */}
          <div className="mt-10 grid grid-cols-3 gap-4 border-t border-orange-200/60 pt-6">
            <div>
              <p className="text-2xl font-black text-gray-900">30 Min</p>
              <p className="text-xs text-gray-500 font-medium">Fast Delivery</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">100%</p>
              <p className="text-xs text-gray-500 font-medium">Fresh Quality</p>
            </div>
            <div>
              <p className="text-2xl font-black text-gray-900">4.9 ★</p>
              <p className="text-xs text-gray-500 font-medium">Customer Rating</p>
            </div>
          </div>
        </div>

        <div className="relative">
          <img
            src={foodImages[currentImage]}
            alt="Delicious restaurant food"
            className="h-[420px] md:h-[460px] w-full rounded-3xl object-cover shadow-2xl transition-opacity duration-700 border-4 border-white"
          />

          <button
            type="button"
            onClick={previousImage}
            aria-label="Previous slide"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-lg shadow-lg hover:bg-white transition"
          >
            ←
          </button>

          <button
            type="button"
            onClick={nextImage}
            aria-label="Next slide"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-3 text-lg shadow-lg hover:bg-white transition"
          >
            →
          </button>

          <div className="absolute bottom-6 left-6 rounded-2xl bg-white/95 backdrop-blur-sm px-5 py-3 shadow-xl border border-gray-100">
            <p className="text-xs font-semibold text-gray-500">
              ⭐ Verified Rating
            </p>
            <p className="text-lg font-black text-gray-900">
              4.9 / 5.0
            </p>
          </div>

          <div className="absolute bottom-6 right-6 flex gap-2">
            {foodImages.map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setCurrentImage(index)}
                aria-label={`Go to slide ${index + 1}`}
                className={`h-2.5 rounded-full transition-all ${
                  currentImage === index
                    ? "w-8 bg-orange-600"
                    : "w-2.5 bg-white/80"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default Hero;
