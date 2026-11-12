import mongoose from "mongoose";

/**
 * Perte d'article : casse, vol, péremption...
 * totalCost valorise la perte au prix d'achat (impact financier réel).
 */
const lossSchema = new mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
      index: true,
    },
    articleName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    type: {
      type: String,
      enum: ["damage", "theft", "expiry", "other"],
      default: "other",
      index: true,
    },
    reason: { type: String, trim: true, default: "" },
    unitCost: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true }
);

lossSchema.index({ date: -1 });

export const Loss = mongoose.model("Loss", lossSchema);
