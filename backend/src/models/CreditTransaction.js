import mongoose from "mongoose";

/**
 * Historique des opérations de crédit d'un client.
 * - charge   : dette créée par une vente à crédit
 * - payment  : remboursement (total ou partiel)
 * - adjustment : correction manuelle
 */
const creditTransactionSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },
    sale: { type: mongoose.Schema.Types.ObjectId, ref: "Sale", default: null },
    type: {
      type: String,
      enum: ["charge", "payment", "adjustment"],
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    balanceAfter: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["cash", "mobile_money", "bank", "other"],
      default: "cash",
    },
    note: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

creditTransactionSchema.index({ customer: 1, createdAt: -1 });

export const CreditTransaction = mongoose.model(
  "CreditTransaction",
  creditTransactionSchema
);
