import { User } from "../models/User.js";
import { ApiError, asyncHandler, escapeRegex } from "../utils/ApiError.js";
import { paged, pagination } from "../utils/pagination.js";

/** GET /api/users (admin) */
export const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};
  if (req.query.q) {
    const regex = new RegExp(escapeRegex(req.query.q), "i");
    filter.$or = [{ name: regex }, { username: regex }, { phone: regex }];
  }
  if (req.query.role) filter.role = req.query.role;

  const [users, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  res.json({ success: true, ...paged(users, total, { page, limit }) });
});

/** POST /api/users (admin) — mot de passe libre. */
export const createUser = asyncHandler(async (req, res) => {
  const { name, username, password, role = "employee", phone = "" } = req.body;

  if (!name || !username || !password) {
    throw new ApiError(400, "Nom, identifiant et mot de passe sont requis.");
  }
  if (!["admin", "employee"].includes(role)) {
    throw new ApiError(400, "Rôle invalide.");
  }

  const exists = await User.exists({ username: String(username).trim().toLowerCase() });
  if (exists) throw new ApiError(409, "Cet identifiant est déjà utilisé.");

  const user = await User.create({ name, username, password, role, phone });
  res.status(201).json({ success: true, user: user.toJSON() });
});

/** PUT /api/users/:id (admin) */
export const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "Utilisateur introuvable.");

  const { name, username, password, role, phone, active } = req.body;

  if (role && !["admin", "employee"].includes(role)) {
    throw new ApiError(400, "Rôle invalide.");
  }

  const isSelf = user._id.equals(req.user._id);
  if (isSelf && role && role !== "admin") {
    throw new ApiError(400, "Vous ne pouvez pas retirer votre propre rôle admin.");
  }
  if (isSelf && active === false) {
    throw new ApiError(400, "Vous ne pouvez pas désactiver votre propre compte.");
  }

  // Empêche de supprimer le dernier administrateur actif.
  if (user.role === "admin" && (role === "employee" || active === false)) {
    const otherAdmins = await User.countDocuments({
      _id: { $ne: user._id },
      role: "admin",
      active: true,
    });
    if (otherAdmins === 0) {
      throw new ApiError(400, "La boutique doit conserver au moins un administrateur actif.");
    }
  }

  if (name !== undefined) user.name = name;
  if (username !== undefined) user.username = username;
  if (phone !== undefined) user.phone = phone;
  if (role !== undefined) user.role = role;
  if (active !== undefined) user.active = Boolean(active);
  if (password) user.password = String(password);

  await user.save();
  res.json({ success: true, user: user.toJSON() });
});

/** DELETE /api/users/:id (admin) */
export const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, "Utilisateur introuvable.");

  if (user._id.equals(req.user._id)) {
    throw new ApiError(400, "Vous ne pouvez pas supprimer votre propre compte.");
  }

  if (user.role === "admin") {
    const otherAdmins = await User.countDocuments({
      _id: { $ne: user._id },
      role: "admin",
      active: true,
    });
    if (otherAdmins === 0) {
      throw new ApiError(400, "Impossible de supprimer le dernier administrateur.");
    }
  }

  await user.deleteOne();
  res.json({ success: true, message: "Utilisateur supprimé." });
});
