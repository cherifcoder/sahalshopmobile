import mongoose from "mongoose";

const articleSchema = new mongoose.Schema(

  {
    name: {
      type: String,
      required: [true, "Le nom de l'article est requis."],
      trim: true,
    },
    sku: {
      type: String,
      trim: true,
      uppercase: true,
      unique: true,
      sparse: true,
    },
    category: { type: String, trim: true, default: "Divers", index: true },
    description: { type: String, trim: true, default: "" },
    purchasePrice: {
      type: Number,
      required: true,
      min: [0, "Le prix d'achat ne peut pas être négatif."],
    },
    salePrice: {
      type: Number,
      required: true,
      min: [0, "Le prix de vente ne peut pas être négatif."],
    },
    stock: {
      type: Number,
      default: 0,
      min: [0, "Le stock ne peut pas être négatif."],
    },
    alertThreshold: { type: Number, default: 5, min: 0 },
    unit: { type: String, default: "pièce", trim: true },
    imageUrl: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

articleSchema.index({ name: "text", sku: "text", category: "text" });

articleSchema.virtual("margin").get(function () {
  return this.salePrice - this.purchasePrice;
});

articleSchema.virtual("marginRate").get(function () {
  return this.purchasePrice > 0
    ? ((this.salePrice - this.purchasePrice) / this.purchasePrice) * 100
    : 0;
});

articleSchema.virtual("isLowStock").get(function () {
  return this.stock <= this.alertThreshold;
});

articleSchema.set("toJSON", { virtuals: true });
articleSchema.set("toObject", { virtuals: true });

articleSchema.pre("validate", function () {
  // Une chaîne vide violerait l'index unique : on la convertit en absence de valeur.
  if (!this.sku) this.sku = undefined;
});

export const Article = mongoose.model("Article", articleSchema);
