import mongoose from "mongoose";

/**
 * Journal de tous les mouvements de stock.
 * quantity est signé : positif = entrée, négatif = sortie.
 */
const stockMovementSchema = new mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
      index: true,
    },
    articleName: { type: String, required: true },
    type: {
      type: String,
      enum: [
        "initial",
        "adjustment_in",
        "adjustment_out",
        "sale",
        "loss",
        "return",
        "sale_cancel",
      ],
      required: true,
      index: true,
    },
    quantity: { type: Number, required: true },
    previousStock: { type: Number, required: true },
    newStock: { type: Number, required: true },
    reason: { type: String, trim: true, default: "" },
    referenceType: {
      type: String,
      enum: ["sale", "loss", "manual", "seed", null],
      default: null,
    },
    referenceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

stockMovementSchema.index({ createdAt: -1 });

export const StockMovement = mongoose.model(
  "StockMovement",
  stockMovementSchema
);
