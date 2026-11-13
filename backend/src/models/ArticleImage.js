import mongoose from "mongoose";

/**
 * Image d'un article, stockée séparément du document Article.
 *
 * Les buffers sont exclus par défaut des requêtes : seules les routes dédiées
 * à l'image les chargent explicitement. Cela évite d'alourdir les listes
 * d'articles et de ralentir l'application mobile.
 */
const articleImageSchema = new mongoose.Schema(
  {
    article: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Article",
      required: true,
      unique: true,
      index: true,
    },
    data: { type: Buffer, required: true, select: false },
    contentType: { type: String, default: "image/jpeg" },
    size: { type: Number, required: true },
    thumbnail: { type: Buffer, required: true, select: false },
    thumbnailContentType: { type: String, default: "image/jpeg" },
    thumbnailSize: { type: Number, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    thumbnailWidth: { type: Number, default: 0 },
    thumbnailHeight: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const ArticleImage = mongoose.model("ArticleImage", articleImageSchema);
