import { Router } from "express";
import {
  createLoss,
  listLosses,
} from "../controllers/loss.controller.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/", listLosses);
router.post("/", createLoss);

export default router;
