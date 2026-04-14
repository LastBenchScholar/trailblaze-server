const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { AppError } = require("../utils/utility");

/**
 * Authentication middleware to protect routes that require authentication.
 * Checks if the user is authenticated by verifying the JWT token in the Authorization header.
 * If the token is valid, the user information is attached to the request object and the next middleware is called.
 * If the token is invalid or not provided, a 401 Unauthorized response is sent.
 */
const protect = async (req, res, next) => {
  try {
    // Check if Authorization header exists
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      throw new AppError("No token provided", 401);
    }

    // Validate Bearer format
    if (!authHeader.startsWith("Bearer ")) {
      throw new AppError("Invalid token format", 401);
    }

    // Extract token from Bearer format
    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new AppError("Invalid token format", 401);
    }

    // Verify and decode JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.SECRET_KEY);
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        throw new AppError("Token expired", 401);
      } else if (jwtError.name === "JsonWebTokenError") {
        throw new AppError("Invalid token", 401);
      } else {
        throw new AppError("Token verification failed", 401);
      }
    }

    // Validate decoded token structure
    if (!decoded || typeof decoded !== "object" || !decoded.userId) {
      throw new AppError("Invalid token structure", 401);
    }

    // Fetch user from database
    const user = await User.findById(decoded.userId).select("-password");

    // Validate user exists
    if (!user) {
      throw new AppError("User not found", 401);
    }

    // Attach user to request and proceed
    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    return res
      .status(error.statusCode || 401)
      .json({ status: "error", message: error.message || "Not authorized" });
  }
};

module.exports = { protect };
