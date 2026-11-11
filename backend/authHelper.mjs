// Server-side authorization helper for FoodHub backend Lambda functions
// Provides genuine cryptographic JWT signature verification and claims validation.
import crypto from "node:crypto";

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  return Buffer.from(base64, "base64");
}

function hasAdminClaim(claims = {}, event = {}) {
  if (claims.role === "admin" || claims["custom:role"] === "admin") {
    return true;
  }

  // 1. Check cognito:groups or groups claim (handles arrays, JSON string, or comma-separated)
  const groups = claims["cognito:groups"] || claims.groups;
  if (Array.isArray(groups)) {
    if (groups.includes("admin")) return true;
  } else if (typeof groups === "string") {
    const list = groups
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((g) => g.trim());
    if (list.includes("admin")) return true;
  }

  // 2. Check API Gateway HTTP API v2.0 authorizer scopes (scopes array or scope/scp claims)
  const jwtScopes =
    event.requestContext?.authorizer?.jwt?.scopes ||
    claims.scope ||
    claims.scp;
  if (Array.isArray(jwtScopes)) {
    if (jwtScopes.includes("admin")) return true;
  } else if (typeof jwtScopes === "string") {
    if (jwtScopes.split(" ").map((s) => s.trim()).includes("admin")) return true;
  }

  return false;
}

export function verifyAdminToken(event = {}) {
  // 1. Check for API Gateway Cognito Authorizer context
  // When API Gateway uses a Cognito User Pool Authorizer, the JWT is verified at the edge
  // and user claims are passed via event.requestContext.authorizer.claims
  const authorizerClaims =
    event.requestContext?.authorizer?.claims ||
    event.requestContext?.authorizer?.jwt?.claims;

  if (authorizerClaims) {
    if (hasAdminClaim(authorizerClaims, event)) {
      return {
        authorized: true,
        user: authorizerClaims,
      };
    }
    return {
      authorized: false,
      statusCode: 403,
      message: "Forbidden: administrative privileges required in Cognito claims.",
    };
  }

  // 2. Extract Authorization header from request
  const headers = event.headers || {};
  const authHeader =
    headers.authorization ||
    headers.Authorization ||
    headers.AUTHORIZATION;

  if (!authHeader) {
    return {
      authorized: false,
      statusCode: 401,
      message: "Authorization header missing. Admin authentication required.",
    };
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return {
      authorized: false,
      statusCode: 401,
      message: "Malformed authorization header. Expected 'Bearer <token>'.",
    };
  }

  const token = parts[1];
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    return {
      authorized: false,
      statusCode: 401,
      message: "Invalid token structure. Expected standard 3-part JWT.",
    };
  }

  const [headerB64, payloadB64, signatureB64] = tokenParts;

  // 3. Decode header and validate algorithm
  let header;
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString("utf-8"));
  } catch {
    return {
      authorized: false,
      statusCode: 401,
      message: "Invalid JWT header format.",
    };
  }

  if (!header || !header.alg || header.alg.toLowerCase() === "none") {
    return {
      authorized: false,
      statusCode: 401,
      message: "Insecure JWT algorithm: 'none' is strictly rejected.",
    };
  }

  // 4. Verify Cryptographic Signature
  const jwtSecret = process.env.JWT_SECRET;
  const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (!jwtSecret) {
    if (isLambda) {
      console.error("[Security Error] JWT_SECRET environment variable is not configured in AWS Lambda.");
      return {
        authorized: false,
        statusCode: 500,
        message: "Server security configuration error: JWT_SECRET environment variable missing.",
      };
    }
  }

  // For HS256: verify HMAC SHA-256 signature
  if (header.alg === "HS256" && jwtSecret) {
    try {
      const expectedSignature = crypto
        .createHmac("sha256", jwtSecret)
        .update(`${headerB64}.${payloadB64}`)
        .digest();

      const actualSignature = base64UrlDecode(signatureB64);

      if (
        actualSignature.length !== expectedSignature.length ||
        !crypto.timingSafeEqual(actualSignature, expectedSignature)
      ) {
        return {
          authorized: false,
          statusCode: 401,
          message: "Invalid token: cryptographic signature verification failed.",
        };
      }
    } catch (sigErr) {
      return {
        authorized: false,
        statusCode: 401,
        message: `Signature verification error: ${sigErr.message}`,
      };
    }
  }

  // 5. Decode and Validate Claims
  let payload;
  try {
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf-8"));
  } catch {
    return {
      authorized: false,
      statusCode: 401,
      message: "Invalid JWT payload format.",
    };
  }

  const nowSeconds = Math.floor(Date.now() / 1000);

  // Validate expiration (exp)
  if (payload.exp !== undefined) {
    const expSeconds =
      payload.exp > 1e11 ? Math.floor(payload.exp / 1000) : payload.exp;
    if (nowSeconds > expSeconds) {
      return {
        authorized: false,
        statusCode: 401,
        message: "Token expired. Please re-authenticate as administrator.",
      };
    }
  }

  // Validate Not-Before (nbf)
  if (payload.nbf !== undefined) {
    const nbfSeconds =
      payload.nbf > 1e11 ? Math.floor(payload.nbf / 1000) : payload.nbf;
    if (nowSeconds < nbfSeconds) {
      return {
        authorized: false,
        statusCode: 401,
        message: "Token not yet valid.",
      };
    }
  }

  // Validate Administrator Role Claim (via role claim or cognito:groups claim)
  if (!hasAdminClaim(payload, event)) {
    return {
      authorized: false,
      statusCode: 403,
      message: "Forbidden: insufficient privileges. Admin role claim required.",
    };
  }

  return {
    authorized: true,
    user: payload,
  };
}

// In-memory JWKS cache across warm AWS Lambda invocations
const jwksCache = new Map();

async function fetchCognitoPublicKey(kid, region, userPoolId) {
  const cacheKey = `${region}:${userPoolId}`;
  let keys = jwksCache.get(cacheKey);

  if (!keys || !keys.has(kid)) {
    const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    const response = await fetch(jwksUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch Cognito JWKS (${response.status})`);
    }
    const jwks = await response.json();
    const keyMap = new Map();
    for (const jwk of jwks.keys || []) {
      if (jwk.kid) {
        keyMap.set(jwk.kid, crypto.createPublicKey({ key: jwk, format: "jwk" }));
      }
    }
    jwksCache.set(cacheKey, keyMap);
    keys = keyMap;
  }

  return keys.get(kid) || null;
}

/**
 * Verifies an authenticated Amazon Cognito customer (or admin) for customer-scoped
 * endpoints such as GET /orders and authenticated POST /orders.
 * Extracts the trusted Cognito user sub purely from API Gateway authorizer claims
 * or a cryptographically verified Cognito JWT. Never trusts client query/body IDs.
 */
export async function verifyCognitoUser(event = {}, options = {}) {
  // 1. Edge-verified claims from API Gateway HTTP API v2.0 / REST Cognito Authorizer
  const authorizerClaims =
    event.requestContext?.authorizer?.jwt?.claims ||
    event.requestContext?.authorizer?.claims;

  if (authorizerClaims) {
    const sub = authorizerClaims.sub ? String(authorizerClaims.sub).trim() : "";
    if (!sub) {
      return {
        authorized: false,
        statusCode: 401,
        message: "Authenticated user subject (sub) missing in Cognito claims.",
      };
    }
    return {
      authorized: true,
      sub,
      user: authorizerClaims,
    };
  }

  // 2. Fallback: verify Authorization: Bearer <token> cryptographically
  const headers = event.headers || {};
  const authHeader =
    headers.authorization ||
    headers.Authorization ||
    headers.AUTHORIZATION;

  if (!authHeader) {
    return {
      authorized: false,
      missingHeader: true,
      statusCode: 401,
      message: "Authorization header missing. Authentication required.",
    };
  }

  const parts = String(authHeader).split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return {
      authorized: false,
      statusCode: 401,
      message: "Malformed authorization header. Expected 'Bearer <token>'.",
    };
  }

  const token = parts[1];
  const tokenParts = token.split(".");
  if (tokenParts.length !== 3) {
    return {
      authorized: false,
      statusCode: 401,
      message: "Invalid token structure. Expected standard 3-part JWT.",
    };
  }

  const [headerB64, payloadB64, signatureB64] = tokenParts;

  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecode(headerB64).toString("utf-8"));
    payload = JSON.parse(base64UrlDecode(payloadB64).toString("utf-8"));
  } catch {
    return {
      authorized: false,
      statusCode: 401,
      message: "Invalid JWT header or payload encoding.",
    };
  }

  if (!header || !header.alg || header.alg.toLowerCase() === "none") {
    return {
      authorized: false,
      statusCode: 401,
      message: "Insecure JWT algorithm is strictly rejected.",
    };
  }

  // Validate token timing (exp / nbf)
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (payload.exp !== undefined) {
    const expSeconds =
      payload.exp > 1e11 ? Math.floor(payload.exp / 1000) : payload.exp;
    if (nowSeconds > expSeconds) {
      return {
        authorized: false,
        statusCode: 401,
        message: "Session expired. Please sign in again.",
      };
    }
  }
  if (payload.nbf !== undefined) {
    const nbfSeconds =
      payload.nbf > 1e11 ? Math.floor(payload.nbf / 1000) : payload.nbf;
    if (nowSeconds < nbfSeconds) {
      return {
        authorized: false,
        statusCode: 401,
        message: "Token not yet valid.",
      };
    }
  }

  const sub = payload.sub ? String(payload.sub).trim() : "";
  if (!sub) {
    return {
      authorized: false,
      statusCode: 401,
      message: "Token missing required subject (sub) claim.",
    };
  }

  // Verify cryptographic signature based on algorithm
  if (header.alg === "RS256") {
    const region = options.region || process.env.AWS_REGION || "ap-south-1";
    const userPoolId =
      options.userPoolId ||
      process.env.COGNITO_USER_POOL_ID ||
      "ap-south-1_znDI8JZbg";
    const expectedIssuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    if (payload.iss !== expectedIssuer) {
      return {
        authorized: false,
        statusCode: 401,
        message: "Invalid Cognito token issuer.",
      };
    }

    if (payload.token_use && payload.token_use !== "access" && payload.token_use !== "id") {
      return {
        authorized: false,
        statusCode: 401,
        message: "Invalid Cognito token_use claim.",
      };
    }

    const configuredClientId = options.clientId || process.env.COGNITO_CLIENT_ID;
    if (configuredClientId) {
      const tokenClient = payload.client_id || payload.aud;
      if (tokenClient !== configuredClientId) {
        return {
          authorized: false,
          statusCode: 401,
          message: "Token client_id does not match configured App Client.",
        };
      }
    }

    if (!header.kid) {
      return {
        authorized: false,
        statusCode: 401,
        message: "RS256 token missing Key ID (kid).",
      };
    }

    try {
      const keyLookup = options.jwksProvider || fetchCognitoPublicKey;
      const publicKey = await keyLookup(header.kid, region, userPoolId);
      if (!publicKey) {
        return {
          authorized: false,
          statusCode: 401,
          message: "Unable to locate matching Cognito public signing key.",
        };
      }

      const isValidSig = crypto.verify(
        "RSA-SHA256",
        Buffer.from(`${headerB64}.${payloadB64}`),
        publicKey,
        base64UrlDecode(signatureB64)
      );

      if (!isValidSig) {
        return {
          authorized: false,
          statusCode: 401,
          message: "Invalid Cognito token signature.",
        };
      }
    } catch (err) {
      return {
        authorized: false,
        statusCode: 401,
        message: `Cognito token verification failed: ${err.message}`,
      };
    }
  } else if (header.alg === "HS256") {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return {
        authorized: false,
        statusCode: 401,
        message: "HS256 verification secret is not configured.",
      };
    }
    try {
      const expectedSig = crypto
        .createHmac("sha256", jwtSecret)
        .update(`${headerB64}.${payloadB64}`)
        .digest();
      const actualSig = base64UrlDecode(signatureB64);
      if (
        actualSig.length !== expectedSig.length ||
        !crypto.timingSafeEqual(actualSig, expectedSig)
      ) {
        return {
          authorized: false,
          statusCode: 401,
          message: "Invalid token: signature verification failed.",
        };
      }
    } catch (sigErr) {
      return {
        authorized: false,
        statusCode: 401,
        message: `Signature verification error: ${sigErr.message}`,
      };
    }
  } else {
    return {
      authorized: false,
      statusCode: 401,
      message: `Unsupported JWT algorithm: ${header.alg}`,
    };
  }

  return {
    authorized: true,
    sub,
    user: payload,
  };
}
