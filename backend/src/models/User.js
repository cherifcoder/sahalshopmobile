import mongoose from "mongoose";
import bcrypt from "bcryptjs";

/**
 * Utilisateur de la boutique.
 * Le mot de passe est LIBRE : aucune contrainte de complexité.
 * Il est uniquement requis (non vide) puis haché avec bcrypt.
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Le nom est requis."], trim: true },
    username: {
      type: String,
      required: [true, "L'identifiant est requis."],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Le mot de passe est requis."],
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "employee"],
      default: "employee",
    },
    phone: { type: String, trim: true, default: "" },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);
