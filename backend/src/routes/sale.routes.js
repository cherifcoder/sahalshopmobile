import { Router } from "express";
import {
  cancelSale,
  createSale,
  downloadInvoice,
  getSale,
  listSales,
} from "../controllers/sale.controller.js";
import { authorize, protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/", listSales);
router.post("/", createSale);
router.get("/:id", getSale);
router.get("/:id/invoice", downloadInvoice);
router.post("/:id/cancel", authorize("admin"), cancelSale);

export default router;
