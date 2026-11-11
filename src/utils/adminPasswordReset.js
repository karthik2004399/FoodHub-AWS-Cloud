// Validation helpers for FoodHub Administrator Forgot Password flow

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAdminResetEmail(email = "") {
  const trimmed = String(email).trim();
  if (!trimmed) {
    return {
      valid: false,
      email: "",
      error: "Please enter your administrator email address.",
    };
  }
  if (!EMAIL_REGEX.test(trimmed)) {
    return {
      valid: false,
      email: trimmed,
      error: "Please enter a valid email address.",
    };
  }
  return {
    valid: true,
    email: trimmed,
    error: "",
  };
}

export function validateAdminPasswordResetForm({
  email = "",
  code = "",
  newPassword = "",
  confirmNewPassword = "",
} = {}) {
  const emailCheck = validateAdminResetEmail(email);
  if (!emailCheck.valid) {
    return { valid: false, error: emailCheck.error };
  }

  const trimmedCode = String(code).trim();
  if (!trimmedCode || trimmedCode.length < 4) {
    return {
      valid: false,
      error: "Please enter the verification code received on your email.",
    };
  }

  if (!newPassword || String(newPassword).length < 8) {
    return {
      valid: false,
      error: "New password must be at least 8 characters long.",
    };
  }

  if (newPassword !== confirmNewPassword) {
    return {
      valid: false,
      error: "Passwords do not match. Please re-enter.",
    };
  }

  return { valid: true, error: "" };
}
