import mongoose from "mongoose";

export const EXPENSE_CATEGORIES = [
  "fuel",
  "salary",
  "delivery",
  "rent",
  "utilities",
  "supplies",
  "maintenance",
  "tax",
  "other",
];

const expenseSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, "Le libellé de la dépense est requis."],
      trim: true,
    },
    category: {
      type: String,
      enum: EXPENSE_CATEGORIES,
      default: "other",
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Le montant est requis."],
      min: [0.01, "Le montant doit être positif."],
    },
    date: { type: Date, default: Date.now, index: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "mobile_money", "bank", "other"],
      default: "cash",
    },
    note: { type: String, trim: true, default: "" },
    receiptUrl: { type: String, trim: true, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true }
);

expenseSchema.index({ date: -1 });

export const Expense = mongoose.model("Expense", expenseSchema);
