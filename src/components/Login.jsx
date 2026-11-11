import { useRef, useState } from "react";
import { authService } from "../services/auth";
import {
  validateAdminPasswordResetForm,
  validateAdminResetEmail,
} from "../utils/adminPasswordReset";

function Login({ onLogin, onCancel, defaultSignup = false, initialAdmin = false }) {
  // 'login' | 'signup' | 'verify' | 'forgot-request' | 'forgot-confirm'
  const [viewMode, setViewMode] = useState(defaultSignup ? "signup" : "login");
  const [isAdminMode, setIsAdminMode] = useState(initialAdmin);
  const [autofillUnlocked, setAutofillUnlocked] = useState(false);

  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    verificationCode: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);

  const unlockAutofill = () => {
    // Synchronously unlock readOnly on both inputs when user interacts so fields
    // load empty, Chrome offers saved-account recommendations on click, and selecting
    // an account fills both email and password together.
    if (emailInputRef.current) {
      emailInputRef.current.readOnly = false;
    }
    if (passwordInputRef.current) {
      passwordInputRef.current.readOnly = false;
    }
    if (!autofillUnlocked) {
      setAutofillUnlocked(true);
    }
  };

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value,
    });
    if (error) setError("");
  };

  const handleAdminToggle = (targetAdmin) => {
    setIsAdminMode(targetAdmin);
    setViewMode("login");
    setAutofillUnlocked(false);
    setFormData((prev) => ({
      ...prev,
      email: "",
      password: "",
    }));
    setError("");
    setInfoMessage("");
  };

  // 1. Submit Registration (Cognito SignUp)
  const handleRegister = async () => {
    const name = formData.name.trim();
    const email = formData.email.trim();
    const phone = formData.phone.trim();
    const password = formData.password;
    const confirmPassword = formData.confirmPassword;

    if (!name) {
      setError("Please enter your full name.");
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!phone || !/^\d{10}$/.test(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const res = await authService.register({
        name,
        email,
        phone,
        password,
      });

      setInfoMessage(
        `Registration initiated! A 6-digit verification code has been sent to ${
          res.codeDeliveryDetails?.Destination || email
        }. Please enter the code below to activate your account.`
      );
      setViewMode("verify");
    } catch (err) {
      setError(err.message || "Registration failed. Please check your details.");
    } finally {
      setLoading(false);
    }
  };

  // 2. Submit Verification Code (Cognito ConfirmSignUp)
  const handleVerify = async () => {
    const email = formData.email.trim();
    const code = formData.verificationCode.trim();

    if (!email) {
      setError("Please enter your registered email address.");
      return;
    }

    if (!code || code.length < 4) {
      setError("Please enter the verification code received on your email.");
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const res = await authService.confirmSignUp({ email, code });
      setInfoMessage(res.message || "Email verified! You can now sign in.");
      setViewMode("login");
      setFormData((prev) => ({ ...prev, verificationCode: "" }));
    } catch (err) {
      setError(err.message || "Verification failed. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  // 3. Resend Verification Code (Cognito ResendConfirmationCode)
  const handleResendCode = async () => {
    const email = formData.email.trim();
    if (!email) {
      setError("Please enter your email to resend the code.");
      return;
    }

    setResendingCode(true);
    setError("");
    try {
      await authService.resendConfirmationCode({ email });
      setInfoMessage(`A fresh verification code has been dispatched to ${email}.`);
    } catch (err) {
      setError(err.message || "Failed to resend verification code.");
    } finally {
      setResendingCode(false);
    }
  };

  // 4. Submit Login (Cognito InitiateAuth)
  const handleLogin = async () => {
    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const result = await authService.login({
        email,
        password,
        expectedRole: isAdminMode ? "admin" : "customer",
      });

      if (onLogin) {
        onLogin(result.user);
      }
    } catch (err) {
      const errMsg = err.message || "Authentication failed.";
      // If user is unconfirmed in Cognito, offer direct jump to verification
      if (
        err.code === "UserNotConfirmedException" ||
        errMsg.toLowerCase().includes("not confirmed")
      ) {
        setError(errMsg);
        setInfoMessage("Enter the code sent to your email to verify your account.");
        setViewMode("verify");
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  // 5. Administrator Forgot Password - Step 1: Request Verification Code
  const handleForgotPasswordRequest = async () => {
    const emailCheck = validateAdminResetEmail(formData.email);
    if (!emailCheck.valid) {
      setError(emailCheck.error);
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const res = await authService.forgotPassword({ email: emailCheck.email });
      setInfoMessage(
        `Verification code sent to ${
          res.codeDeliveryDetails?.Destination || emailCheck.email
        }. Enter the code and your new password below.`
      );
      setFormData((prev) => ({
        ...prev,
        verificationCode: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
      setIsAdminMode(true);
      setViewMode("forgot-confirm");
    } catch (err) {
      setError(
        err.message || "Unable to send password reset verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  // 6. Administrator Forgot Password - Step 2: Confirm Verification Code & New Password
  const handleConfirmForgotPassword = async () => {
    const check = validateAdminPasswordResetForm({
      email: formData.email,
      code: formData.verificationCode,
      newPassword: formData.newPassword,
      confirmNewPassword: formData.confirmNewPassword,
    });
    if (!check.valid) {
      setError(check.error);
      return;
    }

    setLoading(true);
    setError("");
    setInfoMessage("");

    try {
      const res = await authService.confirmForgotPassword({
        email: formData.email.trim(),
        code: formData.verificationCode.trim(),
        newPassword: formData.newPassword,
      });

      setFormData((prev) => ({
        ...prev,
        password: "",
        verificationCode: "",
        newPassword: "",
        confirmNewPassword: "",
      }));
      setIsAdminMode(true);
      setViewMode("login");
      setInfoMessage(
        res.message ||
          "Password reset successful! Please sign in with your new administrator password."
      );
    } catch (err) {
      setError(err.message || "Unable to reset password. Please check the code.");
    } finally {
      setLoading(false);
    }
  };

  // Resend Forgot Password Verification Code
  const handleResendResetCode = async () => {
    const emailCheck = validateAdminResetEmail(formData.email);
    if (!emailCheck.valid) {
      setError(emailCheck.error);
      return;
    }

    setResendingCode(true);
    setError("");
    try {
      const res = await authService.forgotPassword({ email: emailCheck.email });
      setInfoMessage(
        `A fresh password reset code has been sent to ${
          res.codeDeliveryDetails?.Destination || emailCheck.email
        }.`
      );
    } catch (err) {
      setError(err.message || "Failed to resend password reset code.");
    } finally {
      setResendingCode(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (viewMode === "signup") {
      handleRegister();
    } else if (viewMode === "verify") {
      handleVerify();
    } else if (viewMode === "forgot-request") {
      handleForgotPasswordRequest();
    } else if (viewMode === "forgot-confirm") {
      handleConfirmForgotPassword();
    } else {
      handleLogin();
    }
  };

  return (
    <section className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-orange-50/60 px-6 py-12">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 md:p-10 shadow-xl border border-orange-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="mb-6 flex items-center gap-1.5 text-sm font-semibold text-orange-600 hover:text-orange-700"
          >
            ← Back to Home
          </button>
        )}

        <div className="mb-6 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-3xl">
            {isAdminMode ? "🛡️" : "🍽️"}
          </div>

          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            {viewMode === "forgot-request"
              ? "Reset Admin Password"
              : viewMode === "forgot-confirm"
              ? "Set New Password"
              : viewMode === "verify"
              ? "Verify Email"
              : viewMode === "signup"
              ? "Create Account"
              : isAdminMode
              ? "Admin Sign In"
              : "Welcome Back"}
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            {viewMode === "forgot-request"
              ? "Enter your administrator email to receive a reset code"
              : viewMode === "forgot-confirm"
              ? "Enter the verification code sent to your email and choose a new password"
              : viewMode === "verify"
              ? "Enter the 6-digit confirmation code sent to your email"
              : viewMode === "signup"
              ? "Register with Amazon Cognito to start ordering"
              : isAdminMode
              ? "Authenticate with Cognito administrator credentials"
              : "Sign in with Amazon Cognito to continue"}
          </p>

          {/* Mode Switcher Tabs for Login & Signup */}
          {(viewMode === "login" || viewMode === "signup") && (
            <div className="mt-5 flex rounded-xl bg-orange-50 p-1 border border-orange-200">
              <button
                type="button"
                onClick={() => handleAdminToggle(false)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                  !isAdminMode
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Customer
              </button>
              <button
                type="button"
                onClick={() => handleAdminToggle(true)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition ${
                  isAdminMode
                    ? "bg-white text-orange-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Administrator 🛡️
              </button>
            </div>
          )}
        </div>

        {/* Informational Message Banner */}
        {infoMessage && (
          <div
            role="status"
            className="mb-5 rounded-xl bg-green-50 p-3.5 border border-green-200 text-xs font-medium text-green-800"
          >
            {infoMessage}
          </div>
        )}

        {/* Error Message Banner */}
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-xl bg-red-50 p-3.5 border border-red-200 text-xs font-medium text-red-700"
          >
            {error}
          </div>
        )}

        <form
          key={isAdminMode ? "admin-auth-form" : "customer-auth-form"}
          onSubmit={handleSubmit}
          autoComplete="on"
          className="space-y-4"
        >
          {/* Sign Up Fields */}
          {viewMode === "signup" && (
            <div>
              <label
                htmlFor="customer-signup-name"
                className="mb-1.5 block text-xs font-bold uppercase text-gray-600"
              >
                Full Name *
              </label>
              <input
                id="customer-signup-name"
                type="text"
                name="name"
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Rahul Sharma"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500"
                required
              />
            </div>
          )}

          {/* Email Field (Required for all modes) */}
          <div>
            <label
              htmlFor={
                isAdminMode ? `admin-${viewMode}-email` : `customer-${viewMode}-email`
              }
              className="mb-1.5 block text-xs font-bold uppercase text-gray-600"
            >
              Email Address *
            </label>
            <input
              ref={emailInputRef}
              id={isAdminMode ? `admin-${viewMode}-email` : `customer-${viewMode}-email`}
              type="email"
              name="email"
              autoComplete={viewMode === "login" ? "username" : "email"}
              readOnly={viewMode === "login" && !autofillUnlocked}
              onMouseDown={viewMode === "login" ? unlockAutofill : undefined}
              onTouchStart={viewMode === "login" ? unlockAutofill : undefined}
              onFocus={viewMode === "login" ? unlockAutofill : undefined}
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500"
              required
            />
          </div>

          {/* Sign Up Phone */}
          {viewMode === "signup" && (
            <div>
              <label
                htmlFor="customer-signup-phone"
                className="mb-1.5 block text-xs font-bold uppercase text-gray-600"
              >
                Phone Number (10 digits) *
              </label>
              <input
                id="customer-signup-phone"
                type="tel"
                name="phone"
                autoComplete="tel"
                value={formData.phone}
                onChange={handleChange}
                placeholder="9876543210"
                maxLength={10}
                inputMode="numeric"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500"
                required
              />
            </div>
          )}

          {/* Verification Code Input (Account Verification or Admin Forgot Password Confirmation) */}
          {(viewMode === "verify" || viewMode === "forgot-confirm") && (
            <div>
              <label
                htmlFor={
                  isAdminMode
                    ? "admin-verification-code"
                    : "customer-verification-code"
                }
                className="mb-1.5 block text-xs font-bold uppercase text-gray-600"
              >
                Verification Code *
              </label>
              <input
                id={
                  isAdminMode
                    ? "admin-verification-code"
                    : "customer-verification-code"
                }
                type="text"
                name="verificationCode"
                autoComplete="one-time-code"
                value={formData.verificationCode}
                onChange={handleChange}
                placeholder="e.g. 123456"
                maxLength={8}
                className="w-full tracking-widest text-center text-lg font-bold rounded-xl border border-gray-200 px-4 py-3 outline-none transition focus:border-orange-500"
                required
              />
              <div className="mt-2 text-right">
                <button
                  type="button"
                  disabled={resendingCode}
                  onClick={
                    viewMode === "forgot-confirm"
                      ? handleResendResetCode
                      : handleResendCode
                  }
                  className="text-xs font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50"
                >
                  {resendingCode ? "Sending Code..." : "Resend Code"}
                </button>
              </div>
            </div>
          )}

          {/* New Password & Confirm Password (for Admin Forgot Password Step 2) */}
          {viewMode === "forgot-confirm" && (
            <>
              <div>
                <label
                  htmlFor="admin-reset-new-password"
                  className="mb-1.5 block text-xs font-bold uppercase text-gray-600"
                >
                  New Password *
                </label>
                <input
                  id="admin-reset-new-password"
                  type="password"
                  name="newPassword"
                  autoComplete="new-password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  placeholder="Enter new password (min 8 characters)"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500"
                  required
                />
                <p className="mt-1 text-[11px] text-gray-500">
                  Password must include uppercase, lowercase, numbers, and special characters.
                </p>
              </div>

              <div>
                <label
                  htmlFor="admin-reset-confirm-password"
                  className="mb-1.5 block text-xs font-bold uppercase text-gray-600"
                >
                  Confirm New Password *
                </label>
                <input
                  id="admin-reset-confirm-password"
                  type="password"
                  name="confirmNewPassword"
                  autoComplete="new-password"
                  value={formData.confirmNewPassword}
                  onChange={handleChange}
                  placeholder="Re-enter new password"
                  className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500"
                  required
                />
              </div>
            </>
          )}

          {/* Password Field (for Login and Signup) */}
          {(viewMode === "login" || viewMode === "signup") && (
            <div>
              <label
                htmlFor={
                  isAdminMode
                    ? `admin-${viewMode}-password`
                    : `customer-${viewMode}-password`
                }
                className="mb-1.5 block text-xs font-bold uppercase text-gray-600"
              >
                Password *
              </label>
              <input
                ref={passwordInputRef}
                id={
                  isAdminMode
                    ? `admin-${viewMode}-password`
                    : `customer-${viewMode}-password`
                }
                type="password"
                name="password"
                autoComplete={viewMode === "signup" ? "new-password" : "current-password"}
                readOnly={viewMode === "login" && !autofillUnlocked}
                onMouseDown={viewMode === "login" ? unlockAutofill : undefined}
                onTouchStart={viewMode === "login" ? unlockAutofill : undefined}
                onFocus={viewMode === "login" ? unlockAutofill : undefined}
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password (min 8 characters)"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500"
                required
              />
              {viewMode === "signup" && (
                <p className="mt-1 text-[11px] text-gray-500">
                  Password must include uppercase, lowercase, numbers, and special characters.
                </p>
              )}
              {isAdminMode && viewMode === "login" && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("forgot-request");
                      setError("");
                      setInfoMessage("");
                    }}
                    className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                  >
                    Forgot Password?
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Confirm Password (for Signup) */}
          {viewMode === "signup" && (
            <div>
              <label
                htmlFor="customer-signup-confirm-password"
                className="mb-1.5 block text-xs font-bold uppercase text-gray-600"
              >
                Confirm Password *
              </label>
              <input
                id="customer-signup-confirm-password"
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-orange-500"
                required
              />
            </div>
          )}

          {/* Submit Action Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-600 py-3.5 text-sm font-bold text-white shadow-md hover:bg-orange-700 transition disabled:opacity-60"
          >
            {loading
              ? viewMode === "forgot-request"
                ? "Sending Code..."
                : viewMode === "forgot-confirm"
                ? "Resetting Password..."
                : "Connecting to Cognito..."
              : viewMode === "forgot-request"
              ? "Send Verification Code"
              : viewMode === "forgot-confirm"
              ? "Confirm Password Reset"
              : viewMode === "verify"
              ? "Verify Account"
              : viewMode === "signup"
              ? "Create Cognito Account"
              : isAdminMode
              ? "Sign In as Administrator"
              : "Sign In"}
          </button>
        </form>

        {/* Footer Navigation Links */}
        <div className="mt-6 text-center text-sm space-y-2">
          {viewMode === "forgot-request" || viewMode === "forgot-confirm" ? (
            <button
              type="button"
              onClick={() => {
                setIsAdminMode(true);
                setViewMode("login");
                setError("");
                setInfoMessage("");
              }}
              className="font-bold text-orange-600 hover:text-orange-700"
            >
              ← Back to Admin Sign In
            </button>
          ) : viewMode === "verify" ? (
            <button
              type="button"
              onClick={() => {
                setViewMode("login");
                setError("");
                setInfoMessage("");
              }}
              className="font-bold text-orange-600 hover:text-orange-700"
            >
              ← Back to Sign In
            </button>
          ) : viewMode === "signup" ? (
            <div>
              <span className="text-gray-500">Already have an account? </span>
              <button
                type="button"
                onClick={() => {
                  setViewMode("login");
                  setError("");
                  setInfoMessage("");
                }}
                className="font-bold text-orange-600 hover:text-orange-700"
              >
                Sign In
              </button>
            </div>
          ) : (
            <div>
              {!isAdminMode && (
                <div>
                  <span className="text-gray-500">Don&apos;t have an account? </span>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode("signup");
                      setError("");
                      setInfoMessage("");
                    }}
                    className="font-bold text-orange-600 hover:text-orange-700"
                  >
                    Create an account
                  </button>
                </div>
              )}
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("verify");
                    setError("");
                    setInfoMessage("");
                  }}
                  className="text-xs text-gray-500 hover:text-orange-600 font-medium"
                >
                  Have a confirmation code? Verify here
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default Login;
