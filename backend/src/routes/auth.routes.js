import { Router } from "express";
import {
  changePassword,
  login,
  me,
  updateProfile,
} from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.js";
import { loginLimiter } from "../middleware/rateLimit.js";

const router = Router();

router.post("/login", loginLimiter, login);
router.get("/me", protect, me);
router.put("/profile", protect, updateProfile);
router.put("/password", protect, changePassword);

export default router;
