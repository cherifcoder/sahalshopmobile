import mongoose from "mongoose";

/**
 * Client de la boutique.
 * balance > 0 signifie que le client doit de l'argent à la boutique.
 */
const customerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Le nom du client est requis."],
      trim: true,
    },
    phone: { type: String, trim: true, default: "" },
    address: { type: String, trim: true, default: "" },
    creditLimit: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0, min: 0 },
    notes: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

customerSchema.index({ name: "text", phone: "text" });
customerSchema.index({ phone: 1 }, { unique: true, sparse: true });

customerSchema.virtual("availableCredit").get(function () {
  if (!this.creditLimit) return null;
  return Math.max(this.creditLimit - this.balance, 0);
});

customerSchema.set("toJSON", { virtuals: true });
customerSchema.set("toObject", { virtuals: true });

customerSchema.pre("validate", function () {
  if (!this.phone) this.phone = undefined;
});

export const Customer = mongoose.model("Customer", customerSchema);
