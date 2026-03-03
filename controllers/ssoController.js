const debug = require("debug")("lbs:ssoHandler");
const jwt = require("jsonwebtoken");
const { HttpError } = require("../utils/utility");

/**
 * Middleware to check if user token cookie exists or not
 */
module.exports.isAuthenticated = async (req, res, next) => {
  // Check token cookie
  if (req.cookies.access_token) {
    try {
      const decoded = await verifyJwtToken(req.cookies.access_token);

      // Attach user to request for use in route handlers
      req.user = decoded;

      return next();
    } catch (err) {
      debug("Access token expired. Trying refresh token.");
    }
  }

  if (req.cookies.refresh_token) {
    try {
      const refreshResponse = await fetch(`${process.env.SSO_SERVER_URL}/auth/sso/refresh`, {
        method: "POST",
        headers: {
          Cookie: `refresh_token=${req.cookies.refresh_token}`,
        },
        credentials: "include",
      });

      if (!refreshResponse.ok) {
        throw new HttpError(await refreshResponse.json().message, refreshResponse.status);
      }

      const { accessToken, refreshToken } = await refreshResponse.json();
      res.cookie("access_token", accessToken, {
        httpOnly: true,
        sameSite: "none",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      res.cookie("refresh_token", refreshToken, {
        httpOnly: true,
        sameSite: "none",
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000 * 30, // 30 days
      });
      const decoded = await verifyJwtToken(accessToken);
      req.user = decoded;
      return next();
    } catch (err) {
      debug("Token refresh failed:", err);
      res.clearCookie("access_token");
      res.clearCookie("refresh_token");
    }
  }

  debug("Authentication failed - no valid token");

  // TODO: Add security check for X-Frontend-URL and req.get("origin")
  const frontendURL = req.get("X-Frontend-URL") || req.get("referer");
  const redirectURL = `${req.get("origin")}/auth/callback?serviceURL=${frontendURL}`;

  return res.status(401).json({
    status: "error",
    message: "Unauthorized",
    redirectURL: `${process.env.SSO_SERVER_URL}/auth/sso/login?redirectURL=${redirectURL}`,
  });
};

/**
 * Generate the decoded data from a JWT token using RSA public key
 * @param {String} token - JWT token string
 * @returns {Promise<void>}
 */
const verifyJwtToken = (token) =>
  new Promise((resolve, reject) => {
    jwt.verify(
      token,
      process.env.JWT_PUBLIC_KEY,
      { issuer: process.env.JWT_ISSUER, algorithms: ["RS256"] },
      (err, decoded) => {
        if (err) return reject(err);
        return resolve(decoded);
      }
    );
  });

/**
 * Handles SSO token validation and user token cookie creation
 * @route /api/auth/sso
 * @query ssoToken, serviceURL
 * @method GET
 */
module.exports.ssoRedirect = async (req, res) => {
  const { ssoToken, serviceURL } = req.query;

  // Skip if no token is present
  if (!ssoToken) {
    debug("Suspicious Activity: No ssoToken found in ssoRedirect");
    return res.redirect(process.env.CLIENT_URL);
  }

  // Verify SSO Token and fetch user data
  try {
    const response = await fetch(
      `${process.env.SSO_SERVER_URL}/auth/sso/verifytoken?ssoToken=${ssoToken}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.SSO_API_KEY}`,
        },
        credentials: "include",
      }
    );
    if (!response.ok) {
      throw new HttpError(await response.json().message, response.status);
    }
    const { accessToken, refreshToken } = await response.json();
    const decoded = await verifyJwtToken(accessToken);
    debug("Received token for user:", decoded.email);

    // Set JWT token cookie
    res.cookie("access_token", accessToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 * 30, // 24 hours * 30 = 30 days
    });

    return res.json({
      status: "success",
      message: "User authenticated successfully",
      redirectURL: serviceURL,
    });
  } catch (err) {
    debug(err);
    res.status(err.statusCode || 500).json({ status: "error", message: err.message });
  }
};