import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { ensureDatabase } from "./config/db.js";
import { apiLimiter } from "./middleware/rateLimit.js";
import { errorHandler, notFound } from "./middleware/error.js";
import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import articleRoutes from "./routes/article.routes.js";
import saleRoutes from "./routes/sale.routes.js";
import expenseRoutes from "./routes/expense.routes.js";
import lossRoutes from "./routes/loss.routes.js";
import customerRoutes from "./routes/customer.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import metaRoutes from "./routes/meta.routes.js";

const app = express();

app.set("trust proxy", 1);
app.disable("x-powered-by");

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(
  cors({
    origin:
      env.corsOrigin === "*"
        ? true
        : env.corsOrigin.split(",").map((origin) => origin.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

if (env.nodeEnv !== "test") {
  app.use(morgan(env.nodeEnv === "development" ? "dev" : "combined"));
}

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "ok",
    service: "sahal-shop-api",
    shop: env.shop.name,
    time: new Date().toISOString(),
  });
});

app.use("/api", apiLimiter);
app.use("/api", async (_req, _res, next) => {
  try {
    await ensureDatabase();
    next();
  } catch (error) {
    next(error);
  }
});
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/articles", articleRoutes);
app.use("/api/sales", saleRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/losses", lossRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/meta", metaRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
