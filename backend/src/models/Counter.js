import mongoose from "mongoose";

/**
 * Compteur atomique utilisé pour les références de vente
 * et les numéros de facture (pas de doublons même en concurrence).
 */
const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const Counter = mongoose.model("Counter", counterSchema);

export async function nextSequence(key, session = null) {
  const counter = await Counter.findOneAndUpdate(
    { key },
    { $inc: { seq: 1 } },
    { returnDocument: "after", upsert: true, session }
  );
  return counter.seq;
}
