import mongoose from "mongoose";
import { Article } from "../models/Article.js";
import { ArticleImage } from "../models/ArticleImage.js";
import { StockMovement } from "../models/StockMovement.js";
import {
  deleteArticleImage,
  normalizeArticleImagePayload,
  saveArticleImage,
} from "../services/articleImage.service.js";
import { ApiError, asyncHandler, escapeRegex, money } from "../utils/ApiError.js";
import { paged, pagination } from "../utils/pagination.js";

/** GET /api/articles */
export const listArticles = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 100 });
  const filter = {};

  if (req.query.includeInactive !== "true") filter.active = true;
  if (req.query.category) filter.category = req.query.category;
  if (req.query.lowStock === "true") {
    filter.$expr = { $lte: ["$stock", "$alertThreshold"] };
  }
  if (req.query.q) {
    const regex = new RegExp(escapeRegex(req.query.q), "i");
    filter.$or = [{ name: regex }, { sku: regex }, { category: regex }];
  }

  const [articles, total] = await Promise.all([
    Article.find(filter).sort({ name: 1 }).skip(skip).limit(limit),
    Article.countDocuments(filter),
  ]);

  const summary = await Article.aggregate([
    { $match: { active: true } },
    {
      $group: {
        _id: null,
        stockValue: { $sum: { $multiply: ["$stock", "$purchasePrice"] } },
        potentialRevenue: { $sum: { $multiply: ["$stock", "$salePrice"] } },
        totalUnits: { $sum: "$stock" },
        alerts: {
          $sum: { $cond: [{ $lte: ["$stock", "$alertThreshold"] }, 1, 0] },
        },
      },
    },
  ]);

  res.json({
    success: true,
    ...paged(articles, total, { page, limit }),
    summary: summary[0] || {
      stockValue: 0,
      potentialRevenue: 0,
      totalUnits: 0,
      alerts: 0,
    },
  });
});

/** GET /api/articles/categories */
export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await Article.distinct("category", { active: true });
  res.json({ success: true, data: categories.sort() });
});

/** GET /api/articles/:id */
export const getArticle = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) throw new ApiError(404, "Article introuvable.");

  const movements = await StockMovement.find({ article: article._id })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate("user", "name")
    .lean();

  res.json({ success: true, article, movements });
});

/**
 * GET /api/articles/:id/image?size=thumb|full
 * Route publique : elle sert uniquement les photos de produits. Les buffers
 * sont envoyés avec un cache long, ce qui évite de les recharger à chaque
 * ouverture de la liste ou de la fiche article.
 */
export const getArticleImage = asyncHandler(async (req, res) => {
  const size = req.query.size === "thumb" ? "thumb" : "full";
  const image = await ArticleImage.findOne({ article: req.params.id }).select(
    "+data +thumbnail contentType thumbnailContentType"
  );

  if (!image) throw new ApiError(404, "Image introuvable.");

  const buffer = size === "thumb" ? image.thumbnail : image.data;
  const contentType =
    size === "thumb" ? image.thumbnailContentType : image.contentType;

  if (!buffer || !buffer.length) throw new ApiError(404, "Image introuvable.");

  res.set({
    "Content-Type": contentType || "image/jpeg",
    "Content-Length": String(buffer.length),
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "inline",
  });
  res.send(buffer);
});

/** POST /api/articles */
export const createArticle = asyncHandler(async (req, res) => {
  const {
    name,
    sku,
    category = "Divers",
    description = "",
    purchasePrice,
    salePrice,
    stock = 0,
    alertThreshold = 5,
    unit = "pièce",
    imageUrl = "",
    image,
  } = req.body;

  if (!name) throw new ApiError(400, "Le nom de l'article est requis.");
  if (purchasePrice === undefined || salePrice === undefined) {
    throw new ApiError(400, "Les prix d'achat et de vente sont requis.");
  }
  if (Number(purchasePrice) < 0 || Number(salePrice) < 0) {
    throw new ApiError(400, "Les prix ne peuvent pas être négatifs.");
  }
  if (Number(stock) < 0) throw new ApiError(400, "Le stock ne peut pas être négatif.");

  // Valider et décoder l'image avant d'ouvrir la transaction : une image
  // invalide ne doit jamais créer un article à moitié enregistré.
  const imagePayload = image != null ? normalizeArticleImagePayload(image) : null;

  const session = await mongoose.startSession();
  let article;
  try {
    await session.withTransaction(async () => {
      const [created] = await Article.create(
        [
          {
            name,
            sku: sku || undefined,
            category,
            description,
            purchasePrice: money(purchasePrice),
            salePrice: money(salePrice),
            stock: Number(stock),
            alertThreshold: Number(alertThreshold),
            unit,
            imageUrl,
            hasImage: Boolean(imagePayload),
            imageVersion: imagePayload ? new Date() : null,
            createdBy: req.user._id,
          },
        ],
        { session }
      );

      if (imagePayload) {
        await saveArticleImage(created._id, imagePayload, { session });
      }

      if (Number(stock) > 0) {
        await StockMovement.create(
          [
            {
              article: created._id,
              articleName: created.name,
              type: "initial",
              quantity: Number(stock),
              previousStock: 0,
              newStock: Number(stock),
              reason: "Stock initial",
              referenceType: "manual",
              user: req.user._id,
            },
          ],
          { session }
        );
      }
      article = created;
    });
  } finally {
    await session.endSession();
  }

  res.status(201).json({ success: true, article });
});

/** PUT /api/articles/:id */
export const updateArticle = asyncHandler(async (req, res) => {
  const rawImage = req.body.image;
  const removeImage = req.body.removeImage === true || rawImage === null;
  const imagePayload =
    rawImage != null ? normalizeArticleImagePayload(rawImage) : null;

  const allowed = [
    "name",
    "sku",
    "category",
    "description",
    "purchasePrice",
    "salePrice",
    "alertThreshold",
    "unit",
    "imageUrl",
    "active",
  ];

  const session = await mongoose.startSession();
  let article;
  try {
    await session.withTransaction(async () => {
      article = await Article.findById(req.params.id).session(session);
      if (!article) throw new ApiError(404, "Article introuvable.");

      for (const field of allowed) {
        if (req.body[field] !== undefined) article[field] = req.body[field];
      }

      if (article.purchasePrice < 0 || article.salePrice < 0) {
        throw new ApiError(400, "Les prix ne peuvent pas être négatifs.");
      }

      if (imagePayload) {
        await saveArticleImage(article._id, imagePayload, { session });
        article.hasImage = true;
        article.imageVersion = new Date();
      } else if (removeImage) {
        await deleteArticleImage(article._id, { session });
        article.hasImage = false;
        article.imageVersion = null;
      }

      await article.save({ session });
    });
  } finally {
    await session.endSession();
  }

  res.json({ success: true, article });
});

/**
 * POST /api/articles/:id/stock
 * body : { mode: "in" | "out" | "set", quantity, reason }
 * Toute variation est journalisée dans StockMovement.
 */
export const adjustStock = asyncHandler(async (req, res) => {
  const { mode, quantity, reason = "" } = req.body;
  const value = Number(quantity);

  if (!["in", "out", "set"].includes(mode)) {
    throw new ApiError(400, "Mode invalide. Utilisez in, out ou set.");
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new ApiError(400, "La quantité doit être un nombre positif.");
  }

  const session = await mongoose.startSession();
  let article;
  let movement;
  try {
    await session.withTransaction(async () => {
      article = await Article.findById(req.params.id).session(session);
      if (!article) throw new ApiError(404, "Article introuvable.");

      const previousStock = article.stock;
      let newStock = previousStock;
      let type = "adjustment_in";

      if (mode === "in") {
        newStock = previousStock + value;
        type = "adjustment_in";
      } else if (mode === "out") {
        newStock = previousStock - value;
        type = "adjustment_out";
        if (newStock < 0) {
          throw new ApiError(400, `Stock insuffisant (disponible : ${previousStock}).`);
        }
      } else {
        newStock = value;
        type = newStock >= previousStock ? "adjustment_in" : "adjustment_out";
      }

      const delta = newStock - previousStock;
      if (delta === 0) throw new ApiError(400, "Le stock est déjà à cette valeur.");

      article.stock = newStock;
      await article.save({ session });

      [movement] = await StockMovement.create(
        [
          {
            article: article._id,
            articleName: article.name,
            type,
            quantity: delta,
            previousStock,
            newStock,
            reason: reason || "Ajustement manuel",
            referenceType: "manual",
            user: req.user._id,
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  res.json({ success: true, article, movement });
});

/**
 * DELETE /api/articles/:id
 * Archivage (soft delete) pour conserver l'historique des ventes.
 */
export const deleteArticle = asyncHandler(async (req, res) => {
  const article = await Article.findById(req.params.id);
  if (!article) throw new ApiError(404, "Article introuvable.");

  article.active = false;
  await article.save();

  res.json({
    success: true,
    message: "Article archivé. Son historique de ventes est conservé.",
    article,
  });
});
