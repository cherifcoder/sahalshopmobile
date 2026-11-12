import { ApiError } from "../utils/ApiError.js";
import { env } from "../config/env.js";

export const notFound = (req, _res, next) => {
  next(new ApiError(404, `Route introuvable : ${req.method} ${req.originalUrl}`));
};

export const errorHandler = (error, _req, res, _next) => {
  let status = error.statusCode || 500;
  let message = error.message || "Erreur interne du serveur.";
  let details = error.details;

  // Validation Mongoose
  if (error.name === "ValidationError") {
    status = 400;
    message = "Données invalides.";
    details = Object.values(error.errors).map((item) => item.message);
  }

  // Identifiant Mongo invalide
  if (error.name === "CastError") {
    status = 400;
    message = "Identifiant invalide.";
  }

  // Doublon (username, téléphone, référence...)
  if (error.code === 11000) {
    status = 409;
    const field = Object.keys(error.keyValue || {})[0] || "valeur";
    message = `Cette ${field} est déjà utilisée.`;
  }

  if (status >= 500) {
    console.error("❌", error);
  }

  res.status(status).json({
    success: false,
    message,
    ...(details ? { details } : {}),
    ...(env.nodeEnv === "development" && status >= 500
      ? { stack: error.stack }
      : {}),
  });
};
