const bcrypt = require("bcrypt");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const validator = require("validator");
const { AppError } = require("../utils/utility");

/**
 * Generates JWT token with the user payload
 * @param {string} user - User payload to be wrapped in JWT (should be an object)
 * @returns {Promise<string>} - Returns a JWT token with payload wrapped inside
 */
const createToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      email: user.email,
      name: user.name,
    },
    process.env.SECRET_KEY,
    { expiresIn: "72h" },
  );

/**
 * Creates a new user
 * @route /api/auth/register
 * @body name, email, password
 * @method POST
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Required Validation
    if (!name || !email || !password) {
      throw new AppError("All required fields must be provided", 400);
    }

    // Email validation
    if (!validator.isEmail(email)) {
      throw new AppError("Invalid Email Address", 400);
    }

    // Password strength validation
    const isStrongOptions = {
      minLength: 6,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 0,
    };
    if (!validator.isStrongPassword(password, isStrongOptions))
      throw new AppError("Password not strong enough", 400);

    // Check if user already exists
    const existingUser = await User.findOne({ email }).select("email");
    if (existingUser) {
      throw new AppError("User with this email already exists", 400);
    }

    // Hashing
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      password: hash,
    });

    const token = createToken(user);

    res.status(201).json({ token });
  } catch (error) {
    console.log(error);
    res
      .status(error.statusCode || 500)
      .json({ status: "error", message: error.message || "Server Error" });
  }
};

/**
 * Login the user in using credentials
 * @route /api/auth/login
 * @body email, password
 * @method POST
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) throw new AppError("All fields are required", 400);
    if (!validator.isEmail(email)) throw new AppError("Invalid Email Address", 400);

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) throw new AppError(`User with email '${email}' not found`, 400);

    // Match password
    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new AppError("Invalid email or password", 401);

    const token = createToken(user);

    res.status(201).json({ token });
  } catch (error) {
    console.log(error);
    res
      .status(error.statusCode || 500)
      .json({ status: "error", message: error.message || "Server Error" });
  }
};

/**
 * Returns user info if the user is authenticated
 * @route /api/auth/me
 * @middleware protect
 * @method GET
 */
exports.getMe = async (req, res) => {
  res.json(req.user);
};
