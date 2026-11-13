import dotenv from "dotenv";

dotenv.config();

const required = ["MONGODB_URI", "JWT_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Variable d'environnement manquante : ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT || 5000),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI,
  mongoDb: process.env.MONGODB_DB || "sahal_shop",
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  timezone: process.env.TIMEZONE || "Africa/Nouakchott",
  shop: {
    name: process.env.SHOP_NAME || "SAHAL SHOP",
    phone: process.env.SHOP_PHONE || "",
    address: process.env.SHOP_ADDRESS || "",
    email: process.env.SHOP_EMAIL || "",
    currency: process.env.CURRENCY || "MRU",
    currencyLabel: process.env.CURRENCY_LABEL || "UM",
  },
};
