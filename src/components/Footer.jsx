function Footer({ onNavigate }) {
  const currentYear = new Date().getFullYear();

  const handleLink = (view, e) => {
    e.preventDefault();
    if (onNavigate) onNavigate(view);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="border-t border-orange-200 bg-white text-gray-700">
      <div className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand Info */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2">
              <span className="text-3xl">🍽️</span>
              <h2 className="text-2xl font-bold text-orange-600">FoodHub</h2>
            </div>
            <p className="mt-2 text-sm font-semibold italic text-orange-700">
              "Fresh Bites, Happy Moments."
            </p>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">
              Discover delicious meals, explore exciting flavours and enjoy convenient food ordering with FoodHub.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
              Quick Links
            </h3>
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLink("home", e)}
                  className="hover:text-orange-600 transition"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLink("menu", e)}
                  className="hover:text-orange-600 transition"
                >
                  Explore Menu
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLink("my-orders", e)}
                  className="hover:text-orange-600 transition"
                >
                  My Orders
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLink("about", e)}
                  className="hover:text-orange-600 transition"
                >
                  About Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={(e) => handleLink("contact", e)}
                  className="hover:text-orange-600 transition"
                >
                  Contact Us
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Support */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
              Customer Support
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-600">
              <li>
                <span className="font-semibold text-gray-800">Email:</span>{" "}
                <a
                  href="mailto:support@foodhub.com"
                  className="hover:text-orange-600 underline"
                >
                  support@foodhub.com
                </a>
              </li>
              <li>
                <span className="font-semibold text-gray-800">Phone:</span>{" "}
                <a
                  href="tel:+919876543210"
                  className="hover:text-orange-600"
                >
                  +91 98765 43210
                </a>
              </li>
              <li>
                <span className="font-semibold text-gray-800">Hours:</span>{" "}
                10:00 AM – 11:00 PM (All Days)
              </li>
              <li>
                <span className="font-semibold text-gray-800">Location:</span>{" "}
                FoodHub Cloud Kitchen, Technology Park, Mumbai
              </li>
            </ul>
          </div>

          {/* Cloud Architecture Highlights */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900">
              Cloud Infrastructure
            </h3>
            <p className="mt-4 text-xs text-gray-500 leading-relaxed">
              Powered by AWS Serverless architecture: CloudFront CDN, Amazon S3 hosting, Amazon API Gateway, AWS Lambda, and Amazon DynamoDB for real-time order processing.
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                AWS Lambda
              </span>
              <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                DynamoDB
              </span>
              <span className="rounded bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                CloudFront
              </span>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-gray-100 pt-6 text-center text-xs text-gray-500">
          © {currentYear} FoodHub – Cloud-Based Food Ordering Application. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
