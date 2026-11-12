import { Router } from "express";
import { env } from "../config/env.js";
import { EXPENSE_LABELS } from "../controllers/expense.controller.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.get("/", protect, (_req, res) => {
  res.json({
    success: true,
    shop: env.shop,
    expenseCategories: Object.entries(EXPENSE_LABELS).map(([value, label]) => ({
      value,
      label,
    })),
    lossTypes: [
      { value: "damage", label: "Casse / endommagé" },
      { value: "theft", label: "Vol" },
      { value: "expiry", label: "Péremption" },
      { value: "other", label: "Autre" },
    ],
    paymentMethods: [
      { value: "cash", label: "Espèces" },
      { value: "mobile_money", label: "Mobile Money" },
      { value: "bank", label: "Banque" },
    ],
  });
});

export default router;
