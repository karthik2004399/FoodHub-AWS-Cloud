// Role classification and login portal enforcement helpers based strictly on Amazon Cognito groups

export function extractCognitoGroups(payload) {
  if (!payload) return [];
  const groups = payload["cognito:groups"];
  if (Array.isArray(groups)) {
    return groups.map((g) => String(g).trim()).filter(Boolean);
  }
  if (typeof groups === "string") {
    return groups
      .replace(/^\[|\]$/g, "")
      .split(/[,\s]+/)
      .map((g) => g.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Resolves application role strictly from Cognito group membership.
 */
export function resolveRoleFromGroups(groups = []) {
  const uniqueGroups = Array.from(
    new Set(
      (Array.isArray(groups) ? groups : [])
        .map((g) => String(g).trim())
        .filter(Boolean)
    )
  );
  const isAdmin = uniqueGroups.includes("admin");
  const isCustomer =
    !isAdmin &&
    (uniqueGroups.includes("customer") || uniqueGroups.length === 0);

  return {
    uniqueGroups,
    isAdmin,
    isCustomer,
    role: isAdmin ? "admin" : "customer",
  };
}

/**
 * Enforces strict separation between Customer login and Administrator login
 * using the authenticated Cognito user's actual group membership.
 */
export function validateLoginTabRole({ groups = [], expectedRole } = {}) {
  const resolved = resolveRoleFromGroups(groups);

  if (expectedRole === "admin") {
    if (!resolved.isAdmin) {
      return {
        allowed: false,
        role: null,
        error: "Access denied. Administrator account required.",
      };
    }
    return {
      allowed: true,
      role: "admin",
      error: "",
    };
  }

  if (expectedRole === "customer") {
    if (resolved.isAdmin || !resolved.isCustomer) {
      return {
        allowed: false,
        role: null,
        error: "Access denied. Customer account required.",
      };
    }
    return {
      allowed: true,
      role: "customer",
      error: "",
    };
  }

  return {
    allowed: true,
    role: resolved.role,
    error: "",
  };
}
