// server.js (updated version)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");

// Load environment variables
dotenv.config();

// Import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const assessmentRoutes = require("./routes/assessments");
const participantRoutes = require("./routes/participants");
const assignmentRoutes = require("./routes/assignments");

// Import controllers
const dashboardController = require("./controllers/dashboardController");

// Import middleware
const auth = require("./middleware/auth");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Check for required environment variables
if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET environment variable is not defined");
  process.exit(1);
}

if (!process.env.MONGO_URI) {
  console.error("FATAL ERROR: MONGO_URI environment variable is not defined");
  process.exit(1);
}

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB Connected...");
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    // Exit process with failure
    process.exit(1);
  }
};

// Call the connect function
connectDB();

// Define Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/assessments", assessmentRoutes);
app.use("/api/participants", participantRoutes);
app.use("/api/assignments", assignmentRoutes);

// Dashboard route
app.get("/api/dashboard", auth, dashboardController.getDashboardData);
app.get("/api/stats/system", auth, dashboardController.getSystemStats);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Error logging middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Log error to file
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${err.stack}\n`;
  fs.appendFileSync(path.join(logsDir, "error.log"), logEntry);

  res.status(500).json({
    success: false,
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Serve static assets in production
if (process.env.NODE_ENV === "production") {
  // Set static folder
  app.use(express.static(path.join(__dirname, "client/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

// Define PORT
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);

  // Log to file
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - Unhandled Promise Rejection: ${err}\n`;
  fs.appendFileSync(path.join(logsDir, "unhandled-rejections.log"), logEntry);

  // Exit if in production (to allow the process manager to restart)
  if (process.env.NODE_ENV === "production") {
    process.exit(1);
  }
});
