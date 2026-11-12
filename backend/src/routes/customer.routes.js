import { Router } from "express";
import {
  createCustomer,
  deleteCustomer,
  getCustomer,
  getCustomerLedger,
  listCustomers,
  payCustomerDebt,
  updateCustomer,
} from "../controllers/customer.controller.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/", listCustomers);
router.post("/", createCustomer);
router.get("/:id", getCustomer);
router.get("/:id/ledger", getCustomerLedger);
router.put("/:id", updateCustomer);
router.delete("/:id", deleteCustomer);
router.post("/:id/payments", payCustomerDebt);

export default router;
