import { useState } from "react";
import { api } from "../services/api";

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Form validation
    if (
      !formData.name.trim() ||
      !formData.email.trim() ||
      !formData.phone.trim() ||
      !formData.subject.trim() ||
      !formData.message.trim()
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }

    // Validate 10-digit phone
    if (!/^\d{10}$/.test(formData.phone.trim())) {
      setError("Please enter a valid 10-digit phone number.");
      return;
    }

    setLoading(true);

    try {
      const response = await api.sendContact({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        subject: formData.subject.trim(),
        message: formData.message.trim(),
      });

      setSuccess(
        response?.message ||
          "Thank you for contacting FoodHub! Your message has been received."
      );

      // Reset form
      setFormData({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      console.error("Contact submission error:", err);
      setError(
        err.message ||
          "Unable to send message to the backend. Please check your connection."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-orange-50/50 py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="font-semibold uppercase tracking-wider text-orange-600">
            Get in Touch
          </p>
          <h1 className="mt-2 text-4xl font-extrabold text-gray-900 md:text-5xl">
            Contact FoodHub
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-gray-600">
            Have questions about an order or want to share feedback? Our customer support team is here to assist you.
          </p>
        </div>

        <div className="mt-12 grid gap-10 lg:grid-cols-3">
          {/* Contact Details & Info Section */}
          <div className="space-y-6 lg:col-span-1">
            <div className="rounded-3xl bg-white p-7 shadow-sm border border-orange-100">
              <h2 className="text-xl font-bold text-gray-900">
                Contact Information
              </h2>
              <p className="mt-2 text-sm text-gray-500">
                Reach out to us through any of the official channels below.
              </p>

              <div className="mt-6 space-y-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-lg">
                    ✉️
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-gray-500">Official Email</h3>
                    <a
                      href="mailto:contact@foodhub.com"
                      className="text-sm font-semibold text-gray-800 hover:text-orange-600"
                    >
                      contact@foodhub.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-lg">
                    📞
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-gray-500">Support Phone</h3>
                    <a
                      href="tel:+919876543210"
                      className="text-sm font-semibold text-gray-800 hover:text-orange-600"
                    >
                      +91 98765 43210
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-lg">
                    📍
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-gray-500">Restaurant Address</h3>
                    <p className="text-sm text-gray-700 leading-snug">
                      FoodHub Cloud Kitchen, Technology Park, Mumbai, Maharashtra 400001
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-lg">
                    ⏰
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase text-gray-500">Business Hours</h3>
                    <p className="text-sm text-gray-700">
                      10:00 AM – 11:00 PM (Monday – Sunday)
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Guarantee */}
            <div className="rounded-3xl bg-orange-600 p-7 text-white shadow-md">
              <h3 className="text-lg font-bold">Fast Customer Support</h3>
              <p className="mt-2 text-sm text-orange-100 leading-relaxed">
                For order modifications or active delivery inquiries, our operational team monitors all orders placed via our AWS serverless backend.
              </p>
            </div>
          </div>

          {/* Contact Form Section */}
          <div className="rounded-3xl bg-white p-8 md:p-10 shadow-sm border border-orange-100 lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900">Send Us a Message</h2>
            <p className="mt-1 text-sm text-gray-500">
              Fill out the form below and our team will get back to you promptly.
            </p>

            {success && (
              <div
                role="status"
                className="mt-6 rounded-2xl bg-green-50 p-4 border border-green-200 text-sm font-medium text-green-800 flex items-start gap-3"
              >
                <span className="text-xl">✅</span>
                <p>{success}</p>
              </div>
            )}

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-2xl bg-red-50 p-4 border border-red-200 text-sm font-medium text-red-700 flex items-start gap-3"
              >
                <span className="text-xl">⚠️</span>
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="Enter your full name"
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="10-digit mobile number"
                    maxLength={10}
                    inputMode="numeric"
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    placeholder="e.g. Order Inquiry, Feedback"
                    required
                    className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Message *
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  rows="4"
                  placeholder="How can we help you today?"
                  required
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-orange-600 px-8 py-3.5 font-bold text-white shadow-md hover:bg-orange-700 transition disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? "Sending Message..." : "Submit Message"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Contact;
