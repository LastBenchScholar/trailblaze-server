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
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(token, process.env.SECRET_KEY, (err, result) => {
        if (err && err.name === "TokenExpiredError") return "Token expired";
        return result;
      });

      if (decoded === "Token expired") throw new AppError("Auth token expired", 401);

      const user = await User.findById(decoded.userId).select("-password");

      if (!user) throw new AppError("User not found", 401);

      req.user = user;
      next();
    }

    if (!token) {
      throw new AppError("No token provided", 401);
    }
  } catch (error) {
    console.log(error);
    return res
      .status(error.statusCode || 401)
      .json({ status: "error", message: error.message || "Not authorized" });
  }
};

module.exports = { protect };
