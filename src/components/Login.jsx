import { useState } from "react"

function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    })
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    if (!formData.email || !formData.password) {
      alert("Please enter your email and password")
      return
    }

    onLogin({
      name: formData.name || "FoodHub Customer",
      email: formData.email,
    })
  }

  return (
    <section className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-orange-50 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">

        <div className="mb-8 text-center">
          <div className="text-5xl">🍽️</div>

          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            {isSignup ? "Create Account" : "Welcome Back"}
          </h1>

          <p className="mt-2 text-gray-500">
            {isSignup
              ? "Create your FoodHub account"
              : "Login to continue ordering"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {isSignup && (
            <div>
              <label className="mb-2 block font-medium text-gray-700">
                Full Name
              </label>

              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your name"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-orange-500"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-600 py-3 font-semibold text-white hover:bg-orange-700"
          >
            {isSignup ? "Create Account" : "Login"}
          </button>

        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-500">
            {isSignup
              ? "Already have an account?"
              : "Don't have an account?"}
          </p>

          <button
            onClick={() => setIsSignup(!isSignup)}
            className="mt-2 font-semibold text-orange-600 hover:text-orange-700"
          >
            {isSignup
              ? "Login instead"
              : "Create an account"}
          </button>
        </div>

      </div>
    </section>
  )
}

export default Login