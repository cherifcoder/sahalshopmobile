import mongoose from "mongoose";

const saleItemSchema = new mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
    },
    name: { type: String, required: true },
    sku: { type: String, default: "" },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    purchasePrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
    lineProfit: { type: Number, required: true },
  },
  { _id: false }
);

/**
 * Vente (comptant ou crédit).
 * Les prix d'achat sont figés au moment de la vente : le bénéfice
 * reste juste même si le prix d'achat de l'article change plus tard.
 */
const saleSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    invoiceNumber: { type: String, required: true, unique: true },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      default: null,
      index: true,
    },
    customerName: { type: String, default: "Client de passage" },
    items: {
      type: [saleItemSchema],
      validate: {
        validator: (items) => Array.isArray(items) && items.length > 0,
        message: "Une vente doit contenir au moins un article.",
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    totalCost: { type: Number, required: true, min: 0 },
    grossProfit: { type: Number, required: true },
    paymentType: {
      type: String,
      enum: ["cash", "credit", "mobile_money"],
      required: true,
      index: true,
    },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceDue: { type: Number, default: 0, min: 0 },
    paymentStatus: {
      type: String,
      enum: ["paid", "partial", "unpaid"],
      default: "paid",
      index: true,
    },
    status: {
      type: String,
      enum: ["completed", "cancelled"],
      default: "completed",
      index: true,
    },
    note: { type: String, trim: true, default: "" },
    soldBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    soldByName: { type: String, default: "" },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    cancelReason: { type: String, default: "" },
  },
  { timestamps: true }
);

saleSchema.index({ createdAt: -1 });
saleSchema.index({ paymentType: 1, createdAt: -1 });

export const Sale = mongoose.model("Sale", saleSchema);
