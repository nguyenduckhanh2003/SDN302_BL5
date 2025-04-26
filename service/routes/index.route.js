const authRoute = require("./auth.route");
const productRoute = require("./products.route");
const reviewRoutes = require("./reviewandfeedback.route");
const OrderRoutes = require("./order.route");
const chatRoute = require("./chat.route");
// const CategoriesRoutes = require("./categories.route");
const initRoutes = (app) => {
  app.get("/", (req, res) => {
    res.send("Welcome to API Manager Employee!");
  });

  app.use("/auth", authRoute);
  app.use("/api", productRoute);
  app.use("/api/chat", chatRoute);
  app.use("/api/reviews", reviewRoutes);
  app.use("/api/orders", OrderRoutes);
};

module.exports = initRoutes;
