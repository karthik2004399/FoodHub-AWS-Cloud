// Authentication and session management service for FoodHub using Amazon Cognito
// Provides real AWS Cognito User Pool authentication, email verification,
// JWT token handling, cognito:groups claim-based role authorization, and session persistence.
import {
  extractCognitoGroups as extractGroups,
  validateLoginTabRole,
} from "../utils/authRoleValidation";

const STORAGE_KEY = "foodhub_auth_session";

// Public AWS Cognito Configuration (loaded from environment variables)
const AWS_REGION = import.meta.env.VITE_AWS_REGION || "ap-south-1";
const COGNITO_USER_POOL_ID =
  import.meta.env.VITE_COGNITO_USER_POOL_ID || "ap-south-1_znDI8JZbg";
const COGNITO_CLIENT_ID =
  import.meta.env.VITE_COGNITO_CLIENT_ID || "4a19niecbquf7esm2cg3e7ho15";
const COGNITO_ENDPOINT = `https://cognito-idp.${AWS_REGION}.amazonaws.com/`;

// CloudFront Hosting URLs
export const CLOUDFRONT_DOMAIN = "https://d2i0pdn8zaqggl.cloudfront.net";

/**
 * Decodes a genuine JWT token (IdToken or AccessToken) and parses its JSON payload.
 * Uses UTF-8 safe base64url decoding without external libraries.
 */
export function parseJwt(token) {
  if (!token || typeof token !== "string") return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("Cognito JWT decode error:", err);
    return null;
  }
}

/**
 * Maps Amazon Cognito error response codes to clear, human-friendly messages.
 */
function mapCognitoError(errorJson) {
  const code = errorJson?.__type || errorJson?.name || "";
  const rawMessage = errorJson?.message || "";

  if (code.includes("UsernameExistsException")) {
    return "An account with this email address already exists. Please sign in or reset your password.";
  }
  if (code.includes("UserNotConfirmedException")) {
    return "Your email has not been verified yet. Please enter the verification code sent to your inbox.";
  }
  if (code.includes("NotAuthorizedException")) {
    return "Incorrect email or password. Please verify your credentials and try again.";
  }
  if (code.includes("UserNotFoundException")) {
    return "No FoodHub account found with this email address.";
  }
  if (code.includes("InvalidPasswordException")) {
    return "Password does not meet AWS Cognito security requirements. It must be at least 8 characters long and include uppercase, lowercase, numbers, and symbols.";
  }
  if (code.includes("CodeMismatchException")) {
    return "Invalid 6-digit verification code. Please check your email inbox and enter the code again.";
  }
  if (code.includes("ExpiredCodeException")) {
    return "The verification code has expired. Please click 'Resend Code' to receive a new one.";
  }
  if (code.includes("LimitExceededException") || code.includes("TooManyRequestsException")) {
    return "Too many requests. Please wait a few moments before trying again.";
  }
  if (code.includes("InvalidParameterException")) {
    return rawMessage || "Invalid registration input. Please check the provided details.";
  }

  return rawMessage || "Authentication request failed. Please check your connection and credentials.";
}

/**
 * Makes an HTTPS JSON-RPC request to the AWS Cognito Identity Provider endpoint.
 */
async function callCognito(targetAction, payload) {
  const response = await fetch(COGNITO_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-amz-json-1.1",
      "X-Amz-Target": `AWSCognitoIdentityProviderService.${targetAction}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(mapCognitoError(data));
    error.code = data.__type || response.statusText;
    error.raw = data;
    throw error;
  }

  return data;
}

export const authService = {
  /**
   * Retrieves the raw persisted session from localStorage.
   */
  getSession() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data);
    } catch {
      return null;
    }
  },

  /**
   * Returns current authenticated user profile reconstructed from verified Cognito JWT claims.
   * If session is expired, clears session and returns null.
   */
  getCurrentUser() {
    try {
      const session = this.getSession();
      if (!session) return null;

      const tokenToInspect = session.idToken || session.accessToken;
      if (!tokenToInspect) {
        this.logout();
        return null;
      }

      const payload = parseJwt(tokenToInspect);
      if (!payload) {
        this.logout();
        return null;
      }

      // Check token expiration (payload.exp is in seconds)
      const expMs = payload.exp ? payload.exp * 1000 : session.exp;
      if (expMs && Date.now() > expMs) {
        this.logout();
        return null;
      }

      // Dynamically extract groups from genuine Cognito claims
      const groups = extractGroups(payload);
      const isAdmin = groups.includes("admin");
      const role = isAdmin ? "admin" : "customer";

      return {
        id: payload.sub || session.user?.id || "usr_unknown",
        name:
          payload.name ||
          session.user?.name ||
          (isAdmin ? "FoodHub Administrator" : (payload.email || "Customer").split("@")[0]),
        email: payload.email || session.user?.email || "",
        phone: payload.phone_number || session.user?.phone || "",
        role,
        groups,
        username: payload["cognito:username"] || session.user?.username || "",
      };
    } catch (err) {
      console.warn("Error getting current Cognito user:", err);
      return null;
    }
  },

  /**
   * Returns the Cognito Access Token to be sent in Authorization: Bearer <access_token>.
   */
  getAuthToken() {
    const session = this.getSession();
    return session?.accessToken || session?.idToken || null;
  },

  /**
   * Returns the Cognito Access Token specifically.
   */
  getAccessToken() {
    const session = this.getSession();
    return session?.accessToken || null;
  },

  /**
   * Returns the Cognito ID Token specifically.
   */
  getIdToken() {
    const session = this.getSession();
    return session?.idToken || null;
  },

  /**
   * Returns true if user is actively authenticated with a valid non-expired token.
   */
  isAuthenticated() {
    return Boolean(this.getCurrentUser());
  },

  /**
   * Strictly verifies whether the current user is an Administrator
   * by inspecting the genuine Cognito token's cognito:groups claim.
   * NEVER relies on localStorage role values.
   */
  isAdmin() {
    const session = this.getSession();
    if (!session) return false;

    const tokenToInspect = session.idToken || session.accessToken;
    if (!tokenToInspect) return false;

    const payload = parseJwt(tokenToInspect);
    if (!payload) return false;

    const expMs = payload.exp ? payload.exp * 1000 : session.exp;
    if (expMs && Date.now() > expMs) {
      this.logout();
      return false;
    }

    const groups = extractGroups(payload);
    return groups.includes("admin");
  },

  /**
   * Silently refreshes expired Cognito tokens using REFRESH_TOKEN_AUTH.
   */
  async refreshSession() {
    const session = this.getSession();
    if (!session?.refreshToken) {
      return null;
    }

    try {
      const result = await callCognito("InitiateAuth", {
        AuthFlow: "REFRESH_TOKEN_AUTH",
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          REFRESH_TOKEN: session.refreshToken,
        },
      });

      const authResult = result.AuthenticationResult;
      if (!authResult) return null;

      const newAccessToken = authResult.AccessToken;
      const newIdToken = authResult.IdToken || session.idToken;
      const expiresIn = authResult.ExpiresIn || 3600;

      session.accessToken = newAccessToken;
      session.idToken = newIdToken;
      session.exp = Date.now() + expiresIn * 1000;

      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      return session;
    } catch (err) {
      console.warn("Silent token refresh error:", err);
      return null;
    }
  },

  /**
   * Registers a new customer in Amazon Cognito User Pool.
   * Dispatches email confirmation code.
   */
  async register({ name, email, phone, password }) {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const trimmedEmail = email.trim().toLowerCase();
    const userAttributes = [
      { Name: "email", Value: trimmedEmail },
    ];

    if (name?.trim()) {
      userAttributes.push({ Name: "name", Value: name.trim() });
    }

    if (phone?.trim()) {
      const cleanPhone = phone.trim().replace(/[^\d+]/g, "");
      const formattedPhone = cleanPhone.startsWith("+")
        ? cleanPhone
        : `+91${cleanPhone}`; // Standard E.164 phone format
      userAttributes.push({ Name: "phone_number", Value: formattedPhone });
    }

    const result = await callCognito("SignUp", {
      ClientId: COGNITO_CLIENT_ID,
      Username: trimmedEmail,
      Password: password,
      UserAttributes: userAttributes,
    });

    return {
      success: true,
      userSub: result.UserSub,
      userConfirmed: result.UserConfirmed,
      codeDeliveryDetails: result.CodeDeliveryDetails,
    };
  },

  /**
   * Confirms user registration with the 6-digit code received via email.
   */
  async confirmSignUp({ email, code }) {
    if (!email || !code) {
      throw new Error("Email and verification code are required.");
    }

    await callCognito("ConfirmSignUp", {
      ClientId: COGNITO_CLIENT_ID,
      Username: email.trim().toLowerCase(),
      ConfirmationCode: code.trim(),
    });

    return {
      success: true,
      message: "Email verified successfully! You can now sign in.",
    };
  },

  /**
   * Resends the 6-digit confirmation code to user's registered email.
   */
  async resendConfirmationCode({ email }) {
    if (!email) {
      throw new Error("Email is required to resend verification code.");
    }

    const result = await callCognito("ResendConfirmationCode", {
      ClientId: COGNITO_CLIENT_ID,
      Username: email.trim().toLowerCase(),
    });

    return {
      success: true,
      deliveryDetails: result.CodeDeliveryDetails,
    };
  },

  /**
   * Authenticates user against Amazon Cognito User Pool using USER_PASSWORD_AUTH flow.
   * Decodes returned JWT tokens and stores session with expiration.
   */
  async login({ email, password, expectedRole } = {}) {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const trimmedEmail = email.trim().toLowerCase();

    const result = await callCognito("InitiateAuth", {
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: trimmedEmail,
        PASSWORD: password,
      },
    });

    const authResult = result.AuthenticationResult;
    if (!authResult) {
      throw new Error("Authentication response did not contain tokens.");
    }

    const { AccessToken, IdToken, RefreshToken, ExpiresIn } = authResult;

    // Decode token claims
    const idClaims = parseJwt(IdToken) || {};
    const accessClaims = parseJwt(AccessToken) || {};

    // Determine role and enforce login portal separation strictly from cognito:groups claims
    const groups = extractGroups(idClaims).concat(extractGroups(accessClaims));
    const uniqueGroups = Array.from(new Set(groups));

    const roleCheck = validateLoginTabRole({
      groups: uniqueGroups,
      expectedRole,
    });
    if (!roleCheck.allowed) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore storage cleanup errors
      }
      throw new Error(roleCheck.error);
    }

    const isAdmin = roleCheck.role === "admin";
    const role = roleCheck.role;

    const user = {
      id: idClaims.sub || accessClaims.sub || `usr_${Date.now()}`,
      name:
        idClaims.name ||
        (isAdmin ? "FoodHub Administrator" : trimmedEmail.split("@")[0].replace(/[._]/g, " ")),
      email: idClaims.email || trimmedEmail,
      phone: idClaims.phone_number || "",
      role,
      groups: uniqueGroups,
      username: idClaims["cognito:username"] || trimmedEmail,
    };

    const exp = Date.now() + (ExpiresIn || 3600) * 1000;

    const sessionData = {
      user,
      accessToken: AccessToken,
      idToken: IdToken,
      refreshToken: RefreshToken || null,
      exp,
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
    } catch (storageErr) {
      console.warn("Could not persist session to localStorage:", storageErr);
    }

    return {
      user,
      accessToken: AccessToken,
      idToken: IdToken,
      refreshToken: RefreshToken,
    };
  },

  /**
   * Sends a password reset verification code to the user's email
   * via Amazon Cognito ForgotPassword.
   */
  async forgotPassword({ email }) {
    if (!email || !email.trim()) {
      throw new Error("Email address is required.");
    }

    const result = await callCognito("ForgotPassword", {
      ClientId: COGNITO_CLIENT_ID,
      Username: email.trim().toLowerCase(),
    });

    return {
      success: true,
      codeDeliveryDetails: result.CodeDeliveryDetails,
    };
  },

  /**
   * Confirms password reset with the verification code and new password
   * via Amazon Cognito ConfirmForgotPassword.
   */
  async confirmForgotPassword({ email, code, newPassword }) {
    if (!email || !email.trim() || !code || !code.trim() || !newPassword) {
      throw new Error("Email, verification code, and new password are required.");
    }

    await callCognito("ConfirmForgotPassword", {
      ClientId: COGNITO_CLIENT_ID,
      Username: email.trim().toLowerCase(),
      ConfirmationCode: code.trim(),
      Password: newPassword,
    });

    return {
      success: true,
      message:
        "Password reset successful! Please sign in with your new administrator password.",
    };
  },

  /**
   * Terminates active session locally and dispatches GlobalSignOut if token is present.
   */
  async logout() {
    try {
      const session = this.getSession();
      const accessToken = session?.accessToken;

      localStorage.removeItem(STORAGE_KEY);

      if (accessToken) {
        callCognito("GlobalSignOut", { AccessToken: accessToken }).catch(() => {
          // Ignore network errors on logout
        });
      }
    } catch (err) {
      console.warn("Logout error:", err);
    }
  },

  /**
   * Returns Amazon Cognito Hosted UI and App Client details for AWS Console configuration.
   */
  getHostedUiConfig() {
    return {
      userPoolId: COGNITO_USER_POOL_ID,
      clientId: COGNITO_CLIENT_ID,
      region: AWS_REGION,
      callbackUrl: CLOUDFRONT_DOMAIN,
      logoutUrl: CLOUDFRONT_DOMAIN,
      cognitoEndpoint: COGNITO_ENDPOINT,
    };
  },
};
