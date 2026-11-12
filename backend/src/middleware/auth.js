import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError, asyncHandler } from "../utils/ApiError.js";

/** Vérifie le JWT et recharge l'utilisateur (compte actif obligatoire). */
export const protect = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) {
    throw new ApiError(401, "Authentification requise.");
  }

  const token = header.split(" ")[1];
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, "Session invalide ou expirée.");
  }

  const user = await User.findById(payload.id);
  if (!user || !user.active) {
    throw new ApiError(401, "Compte introuvable ou désactivé.");
  }

  req.user = user;
  next();
});

/** Restreint l'accès à un ou plusieurs rôles. */
export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return next(new ApiError(403, "Accès réservé à l'administrateur."));
  }
  next();
};
