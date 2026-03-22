/**
 * AUTHENTICATION MIDDLEWARE
 * 
 * @description Verifies JWT token and protects routes from unauthorized access
 * This middleware should be used on all routes that require authentication
 * 
 * @usage
 * router.post("/create", authMiddleware, createPost);
 * 
 * @flow
 * 1. Extract Bearer token from Authorization header
 * 2. Verify token signature using JWT_SECRET
 * 3. If valid, attach decoded user data to req.user
 * 4. Continue to next middleware/controller
 * 5. If invalid, return 403 error
 * 
 * @security
 * - Tokens expire after 1 hour
 * - Secret key prevents token tampering
 * - Generic error messages prevent information leakage
 */

const jwt = require("jsonwebtoken");
const HttpError = require("../models/errorModel");

/**
 * @function authMiddleware
 * @async
 * @description Verifies JWT token and populates req.user with decoded user data
 * 
 * @param {Object} req - Express request object
 * @param {string} req.headers.authorization - Authorization header (e.g., "Bearer token")
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * 
 * @returns {void} Calls next() if token is valid
 * @throws {HttpError} 401 if no token provided
 * @throws {HttpError} 403 if token is invalid or expired
 * 
 * @sets req.user - Object containing decoded JWT payload
 * @sets req.user.id - User ID from token
 * @sets req.user.name - User name from token
 * 
 * @example
 * // Client sends request with auth header:
 * GET /api/posts
 * Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 * 
 * // If token is valid, req.user = { id: "123", name: "John" }
 * // If token is invalid, returns 403 error
 */
const authMiddleware = async (req, res, next) => {
  // Extract authorization header
  // Supports both "Authorization" and "authorization" (case-insensitive)
  const authorization = req.headers.authorization || req.headers.Authorization;

  // Check if Authorization header exists and starts with "Bearer "
  if (authorization && authorization.startsWith("Bearer ")) {
    // Extract token by removing "Bearer " prefix
    // Format: "Bearer {token}" → {token}
    const token = authorization.split(" ")[1];
    
    // Verify JWT token signature and expiration
    jwt.verify(token, process.env.JWT_SECRET, (err, info) => {
      if (err) {
        // Token is invalid or expired
        return next(new HttpError("Unauthorized. Invalid token.", 403));
      }

      if (info.type && info.type !== "access") {
        return next(new HttpError("Unauthorized. Invalid token type.", 403));
      }

      // Token is valid, attach decoded user data to request
      // info = { id: user._id, name: user.name } from jwt.sign()
      req.user = info;
      
      // Continue to next middleware/controller
      next();
    });
  } else {
    // No authorization header or invalid format
    return next(new HttpError("Unauthorized. No token provided.", 401));
  }
};

const requireRole = (...allowedRoles) => (req, res, next) => {
  const userRole = req.user?.role;
  if (!userRole || !allowedRoles.includes(userRole)) {
    return next(new HttpError("Forbidden. Insufficient role permissions.", 403));
  }
  return next();
};

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
