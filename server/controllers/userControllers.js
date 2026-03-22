/**
 * USER CONTROLLER MODULE
 * 
 * @description Handles all user authentication and profile management operations
 * Includes registration, login, profile management, avatar upload, and user discovery
 * 
 * @requires bcryptjs - Password hashing
 * @requires jsonwebtoken - JWT token generation for authentication
 * @requires uuid - Unique file naming for uploads
 */

const bcrypt = require("bcryptjs");
const User = require("../models/userModel");
const HttpError = require("../models/errorModel");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const { v4: uuid } = require("uuid");

const signAccessToken = (user) =>
  jwt.sign(
    { id: user._id, name: user.name, role: user.role, type: "access" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES || "1h" }
  );

const signRefreshToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      tokenVersion: user.refreshTokenVersion,
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d" }
  );

// ╔════════════════════════════════════════════════════════════════╗
// ║                    REGISTRATION CONTROLLER                     ║
// ╚════════════════════════════════════════════════════════════════╝

/**
 * @function registerUser
 * @async
 * @description Handles new user registration with email validation and password hashing
 * 
 * @route POST /api/users/register
 * @access Public
 * 
 * @param {Object} req - Express request object
 * @param {string} req.body.name - User's full name
 * @param {string} req.body.email - User's email address (unique)
 * @param {string} req.body.password - User's password (min 6 chars)
 * @param {string} req.body.password2 - Password confirmation
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} 201 - Success message with created user email
 * @returns {Object} 422 - Validation error (missing fields, duplicate email, weak password, mismatched passwords)
 * 
 * @security
 * - Passwords are hashed using bcryptjs with salt rounds of 10
 * - Email is normalized to lowercase to prevent duplicate accounts
 * - No sensitive data is logged
 * 
 * @example
 * POST /api/users/register
 * {
 *   "name": "John Doe",
 *   "email": "john@example.com",
 *   "password": "SecurePass123",
 *   "password2": "SecurePass123"
 * }
 * 
 * Response: { message: "NewUser john@example.com registered." }
 */
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, password2 } = req.body;
    
    // Validate all required fields are provided
    if (!name || !email || !password) {
      return next(new HttpError("Fill in all fields.", 422));
    }

    // Convert email to lowercase for case-insensitive comparison
    // This prevents duplicate accounts like "john@example.com" and "John@Example.com"
    const newEmail = email.toLowerCase();

    // Check if email already exists in the database
    // This maintains email uniqueness constraint
    const emailExists = await User.findOne({ email: newEmail });
    if (emailExists) {
      return next(new HttpError("Email already exists.", 422));
    }

    // Validate password strength (minimum 6 characters)
    // TODO: Enhance with regex for complexity requirements (uppercase, symbols, numbers)
    if (password.trim().length < 6) {
      return next(
        new HttpError("Password should be at least 6 characters.", 422)
      );
    }

    // Ensure both password fields match
    if (password !== password2) {
      return next(new HttpError("Passwords do not match.", 422));
    }

    // Hash password using bcryptjs (OWASP recommended)
    // Salt rounds = 10 provides good security vs performance balance
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user document in MongoDB
    // Password is stored as hash, never stored in plain text
    const newUser = await User.create({
      name: name.trim(),
      email: newEmail,
      password: hashedPassword,
      // avatar, posts fields are auto-initialized per schema defaults
    });

    // Return success response with created user email
    res.status(201).json(`NewUser ${newUser.email} registered.`);
  } catch (error) {
    // Handle unexpected errors (DB connection issues, validation errors, etc)
    return next(new HttpError("User registration failed.", 422));
  }
};


// ╔════════════════════════════════════════════════════════════════╗
// ║                       LOGIN CONTROLLER                         ║
// ╚════════════════════════════════════════════════════════════════╝

/**
 * @function loginUser
 * @async
 * @description Authenticates user with email and password, returns JWT token
 * 
 * @route POST /api/users/login
 * @access Public
 * 
 * @param {Object} req - Express request object
 * @param {string} req.body.email - User's email address
 * @param {string} req.body.password - User's password (in plain text, will be hashed for comparison)
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {Object} 200 - { token, id, name } - JWT token and user info for client storage
 * @returns {Object} 401 - "Invalid credentials" - User not found
 * @returns {Object} 422 - "Invalid credentials" - Password mismatch
 * 
 * @token JWT Token
 * - Payload: { id (user._id), name }
 * - Expiration: 1 hour
 * - Secret: process.env.JWT_SECRET (set in .env)
 * 
 * @flow
 * 1. Validate email and password provided
 * 2. Query user by email (case-insensitive)
 * 3. Compare provided password with hashed password in DB
 * 4. Generate JWT token with user id and name
 * 5. Return token to client for subsequent authenticated requests
 * 
 * @security
 * - Passwords never transmitted, only hashed password compared
 * - Token expires after 1 hour (refresh token optional enhancement)
 * - Generic error messages prevent email enumeration attacks
 * 
 * @todo Implement refresh token mechanism for better security
 * @todo Add login attempt tracking for brute-force protection
 * @todo Log login events for security audit trail
 */
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Validate both email and password are provided
    if (!email || !password) {
      return next(new HttpError("Fill in all fields", 422));
    }
    
    // Normalize email to lowercase for lookup
    const newEmail = email.toLowerCase();
    
    // Query user from database by email
    const user = await User.findOne({ email: newEmail });
    if (!user) {
      // Generic message to prevent email enumeration attacks
      return next(new HttpError("Invalid credentials", 401));
    }
    
    // Compare provided password with stored hash using bcrypt
    // bcrypt.compare() safely compares plain text to hash
    const comparePass = await bcrypt.compare(password, user.password);
    if (!comparePass) {
      return next(new HttpError("Invalid credentials", 401));
    }
    
    // Extract user id and name for token payload
    const { _id: id, name, role } = user;

    const token = signAccessToken(user);
    const refreshToken = signRefreshToken(user);
    
    // Return token and user info to client
    // Client stores token in localStorage and sends in Authorization header
    res.status(200).json({ token, refreshToken, id, name, role });
  } catch (error) {
    return next(
      new HttpError("Login failed. Please check your credentials.", 422)
    );
  }
};

const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return next(new HttpError("Refresh token is required.", 401));
    }

    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    if (decoded.type !== "refresh") {
      return next(new HttpError("Invalid refresh token type.", 401));
    }

    const user = await User.findById(decoded.id);
    if (!user) return next(new HttpError("User not found.", 404));

    if (decoded.tokenVersion !== user.refreshTokenVersion) {
      return next(new HttpError("Refresh token expired. Please login again.", 401));
    }

    // Rotate refresh token by bumping version.
    user.refreshTokenVersion += 1;
    await user.save();

    const token = signAccessToken(user);
    const newRefreshToken = signRefreshToken(user);

    res.status(200).json({ token, refreshToken: newRefreshToken });
  } catch (error) {
    return next(new HttpError("Failed to refresh token.", 401));
  }
};

const logoutUser = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $inc: { refreshTokenVersion: 1 },
    });
    res.status(200).json({ message: "Logged out successfully." });
  } catch (error) {
    return next(new HttpError("Logout failed.", 500));
  }
};

//************************  USER PROFILE *******************//
//POST : api/users/:id
// PROTECTED
const getUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("name avatar email posts");
    if (!user) {
      return next(new HttpError("User not found.", 404));
    }
    res.status(200).json(user);
  } catch (error) {
    return next(new HttpError(error));
  }
};

//************************  CHANGE  USER AVATAR(profile pricture) *******************//
//POST : api/users/change-avatar
// PROTECTED
const changeAvatar = async (req, res, next) => {
  try {
    if (!req.files || !req.files.avatar) {
      return next(new HttpError("Please choose an image", 422));
    }

    const user = await User.findById(req.user.id);
    if (user.avatar) {
      fs.unlink(path.join(__dirname, "..", "uploads", user.avatar), (err) => {
        if (err) {
          return next(new HttpError(err.message));
        }
      });
    }

    const { avatar } = req.files;
    if (avatar.size > 500000) {
      // 500 KB = 500000 bytes
      return next(
        new HttpError("Profile picture too big. Should be less than 500kb", 422)
      );
    }

    const splittedFilename = avatar.name.split(".");
    const newFilename = `${splittedFilename[0]}_${uuid()}.${
      splittedFilename[splittedFilename.length - 1]
    }`;

    avatar.mv(
      path.join(__dirname, "..", "uploads", newFilename),
      async (err) => {
        if (err) {
          return next(new HttpError(err.message));
        }

        const updatedAvatar = await User.findByIdAndUpdate(
          req.user.id,
          { avatar: newFilename },
          { new: true }
        );

        if (!updatedAvatar) {
          return next(new HttpError("Avatar cannot be changed"));
        }

        res.status(200).json(updatedAvatar);
      }
    );
  } catch (error) {
    return next(new HttpError(error.message));
  }
};

//************************  EDIT USER DETAILS *******************//
//POST : api/users/edit-user
// PROTECTED
const editUser = async (req, res, next) => {
  try {
    const { name, email, currentPassword, newPassword, confirmNewPassword } =
      req.body;
    if (
      !name ||
      !currentPassword ||
      !email ||
      !newPassword ||
      !confirmNewPassword
    ) {
      return next(new HttpError("Fill in all fields", 422));
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return next(new HttpError("User not found.", 403));
    }

    const emailExist = await User.findOne({ email });
    if (emailExist && emailExist._id.toString() !== req.user.id.toString()) {
      return next(new HttpError("Email already exists.", 422));
    }

    const validateUserPassword = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!validateUserPassword) {
      return next(new HttpError("Invalid Current Password.", 422));
    }

    if (newPassword !== confirmNewPassword) {
      return next(new HttpError("New Passwords do not match.", 422));
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(newPassword, salt);

    const newInfo = await User.findByIdAndUpdate(
      req.user.id,
      { name, email, password: hash },
      { new: true }
    );

    res.status(200).json(newInfo);
  } catch (error) {
    return next(new HttpError(error.message, 500));
  }
};

//************************  GET AUTHORS *******************//
//GET : api/users (not POST)
//UNPROTECTED (since you're just listing authors)
const getAuthors = async (req, res, next) => {
  try {
    const authors = await User.find().select("name avatar posts"); 
    console.log("Authors fetched:", authors); // ✅ Debug
    res.json(authors);
  } catch (error) {
    return next(new HttpError(error.message || "Fetching authors failed", 500));
  }
};



module.exports = {
  registerUser,
  loginUser,
  getUser,
  editUser,
  getUser,
  getAuthors,
  changeAvatar,
  refreshAccessToken,
  logoutUser,
};
