import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { ApiError, asyncHandler } from "../utils/ApiError.js";

const signToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn,
  });

/**
 * POST /api/auth/login
 * Le mot de passe est libre : on vérifie simplement qu'il correspond au hash.
 */
export const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new ApiError(400, "Identifiant et mot de passe requis.");
  }

  const user = await User.findOne({
    username: String(username).trim().toLowerCase(),
  }).select("+password");

  if (!user || !(await user.comparePassword(String(password)))) {
    throw new ApiError(401, "Identifiant ou mot de passe incorrect.");
  }

  if (!user.active) {
    throw new ApiError(403, "Ce compte est désactivé. Contactez l'administrateur.");
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  res.json({
    success: true,
    token: signToken(user),
    user: user.toJSON(),
  });
});

/** GET /api/auth/me */
export const me = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user.toJSON() });
});

/** PUT /api/auth/profile */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone } = req.body;
  if (name !== undefined) req.user.name = name;
  if (phone !== undefined) req.user.phone = phone;
  await req.user.save();
  res.json({ success: true, user: req.user.toJSON() });
});

/** PUT /api/auth/password — mot de passe libre, seul le champ est obligatoire. */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Mot de passe actuel et nouveau mot de passe requis.");
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.comparePassword(String(currentPassword)))) {
    throw new ApiError(400, "Mot de passe actuel incorrect.");
  }

  user.password = String(newPassword);
  await user.save();

  res.json({ success: true, message: "Mot de passe mis à jour." });
});
