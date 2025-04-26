const authRoute = require("./auth.route");
const productRoute = require("./products.route");
const reviewRoutes = require("./reviewandfeedback.route");
const OrderRoutes = require("./order.route");
const storeRoute = require("./store.routes");
const chatRoute = require("./chat.route");
const rateLimit = require("express-rate-limit");
// const CategoriesRoutes = require("./categories.route");

const initRoutes = (app) => {
  // Rate limiting for API endpoints
  const apiLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 200, // Limit each IP to 300 requests per window
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again later",
  });
  app.get("/", (req, res) => {
    res.send("Welcome to API Manager Employee!");
  });
  app.use("/api/chat", apiLimiter);
  app.use("/api/chat", chatRoute);

  app.use("/auth", authRoute);
  app.use("/api", productRoute);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/orders", OrderRoutes);
  app.use("/api/stores", storeRoute);
  // Apply rate limiting to all API routes
};

module.exports = initRoutes;
