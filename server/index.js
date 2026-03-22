/**
 * ╔═══════════════════════════════════════════════════════════════════╗
 * ║                    TECHNOSPHERE SERVER                           ║
 * ║              MERN Stack Tech Blog Backend Server                 ║
 * ╚═══════════════════════════════════════════════════════════════════╝
 * 
 * @description Main Express server entry point
 * Sets up routes, middleware, database connection, and starts HTTP server
 * 
 * @configuration
 * Environment variables required in .env:
 * - MONGO_URI: MongoDB connection string (e.g., mongodb+srv://...)
 * - JWT_SECRET: Secret key for JWT token signing
 * - PORT: Server port (default: 5000)
 * - ALLOWED_ORIGINS: Comma-separated frontend URLs for CORS
 * - NODE_ENV: development, staging, or production
 * 
 * @middleware
 * - express.json(): Parse JSON request bodies
 * - express.urlencoded(): Parse URL-encoded form data
 * - cors(): Handle cross-origin requests from frontend
 * - express-fileupload: Handle multipart form-data (file uploads)
 * - Custom error handling middleware
 */

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📦 DEPENDENCIES & CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const express = require("express");
const cors = require("cors");
const { connect } = require("mongoose");
require("dotenv").config(); // Load environment variables from .env file
const upload = require("express-fileupload");
const http = require("http");
const { Server } = require("socket.io");

// Import application routes
const userRoutes = require("./routes/userRoutes");
const postsRoutes = require("./routes/postsRoutes");
const commentsRoutes = require("./routes/commentsRoutes");
const notificationsRoutes = require("./routes/notificationsRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const draftsRoutes = require("./routes/draftsRoutes");
const likesRoutes = require("./routes/likesRoutes");
const followsRoutes = require("./routes/followsRoutes");

// Import error handling middleware
const { notFound, errorHandler } = require("./middleware/errorMiddleware.js");

// Create Express application instance
const app = express();
const server = http.createServer(app);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔐 CORS CONFIGURATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * 
 * Allows frontend to make requests from different domain
 * ALLOWED_ORIGINS env var can contain multiple URLs (comma-separated)
 * 
 * Example: ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com
 * 
 * Security: Only whitelisted origins can access this API
 */
const ALLOWED_ORIGINS = (
  process.env.ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  credentials: true,
  origin: (origin, callback) => {
    // Allow non-browser requests (no origin header) and whitelisted frontend origins.
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛠️ MIDDLEWARE SETUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * JSON Parser Middleware
 * Automatically parses incoming JSON request bodies
 * Makes the data available via req.body
 */
app.use(express.json({ extended: true }));

/**
 * URL-Encoded Parser Middleware
 * Parses form-data and query parameters
 */
app.use(express.urlencoded({ extended: true }));

/**
 * CORS Middleware
 * Enables cross-origin requests from frontend client
 * credentials: true allows cookies/auth headers in requests
 * origin: ALLOWED_ORIGINS validates origin is whitelisted
 */
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/**
 * File Upload Middleware
 * Enables multipart/form-data handling for file uploads
 * Used for avatar uploads and post thumbnails
 */
app.use(upload());

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📁 STATIC FILE SERVING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Serve uploaded files (avatars, thumbnails) as static assets
 * 
 * Any request to /uploads/filename will serve from ./uploads directory
 * This allows frontend to display images: <img src="/uploads/avatar.jpg" />
 * 
 * Example:
 * GET /uploads/user_avatar_12345.jpg
 * Returns: ./uploads/user_avatar_12345.jpg
 */
app.use("/uploads", express.static(__dirname + "/uploads"));

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛣️ API ROUTES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * User Routes
 * Handles authentication and user management
 * 
 * Routes defined in ./routes/userRoutes.js:
 * POST   /api/users/register       - Create new account
 * POST   /api/users/login          - Authenticate user
 * GET    /api/users                - List all users
 * GET    /api/users/:id            - Get user profile
 * POST   /api/users/change-avatar  - Upload profile picture (protected)
 * PATCH  /api/users/edit-user      - Update profile (protected)
 */
app.use("/api/users", userRoutes);

/**
 * Posts Routes
 * Handles blog post CRUD operations
 * 
 * Routes defined in ./routes/postsRoutes.js:
 * POST   /api/posts                         - Create post (protected)
 * GET    /api/posts                         - List all posts
 * GET    /api/posts/:id                     - Get single post
 * PATCH  /api/posts/:id                     - Edit post (protected)
 * DELETE /api/posts/:id                     - Delete post (protected)
 * GET    /api/posts/users/:id               - Get posts by author
 * GET    /api/posts/categories/:category    - Get posts by category
 */
app.use("/api/posts", postsRoutes);
app.use("/api/comments", commentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/drafts", draftsRoutes);
app.use("/api/likes", likesRoutes);
app.use("/api/follows", followsRoutes);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⚠️ ERROR HANDLING
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 404 Handler Middleware
 * Catches all requests that don't match any defined route
 * Converts to error and passes to error handler
 */
app.use(notFound);

/**
 * Global Error Handler Middleware
 * Must be last middleware in chain
 * Catches all errors thrown in controllers/middleware
 * Returns formatted JSON error response to client
 */
app.use(errorHandler);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 SERVER STARTUP & DATABASE CONNECTION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * MongoDB Connection & Server Startup
 * 
 * Flow:
 * 1. mongoose.connect() establishes connection to MongoDB
 * 2. If successful, app.listen() starts HTTP server
 * 3. Server listens on PORT (default: 5000)
 * 4. Both services must start before server is ready
 * 5. If DB connection fails, error is logged and server doesn't start
 * 
 * This prevents starting server if database is unreachable
 */
const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
});

io.on("connection", (socket) => {
  socket.on("join-post", (postId) => {
    if (postId) socket.join(`post:${postId}`);
  });

  socket.on("join-user", (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });
});

app.locals.io = io;

const PORT = Number(process.env.PORT) || 5000;

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Stop the existing process or change PORT in server/.env.`
    );
    process.exit(1);
  }

  console.error(`Server failed to start: ${err.message}`);
  process.exit(1);
});

connect(process.env.MONGO_URI)
  .then(
    // Success: Start HTTP server
    server.listen(PORT, () =>
      console.log(`✅ Server is listening on port ${PORT} and MongoDB connected`)
    )
  )
  .catch((err) => 
    // Error: Log and exit
    console.log(`❌ Connection failed: ${err.message}`)
  );

