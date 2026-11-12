import mongoose from "mongoose";
import { Article } from "../models/Article.js";
import { Loss } from "../models/Loss.js";
import { StockMovement } from "../models/StockMovement.js";
import { ApiError, asyncHandler, money } from "../utils/ApiError.js";
import { paged, pagination } from "../utils/pagination.js";
import { parseDate } from "../utils/dates.js";

/** GET /api/losses */
export const listLosses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};

  if (req.query.type) filter.type = req.query.type;
  if (req.query.article) {
    if (!mongoose.isValidObjectId(req.query.article)) {
      throw new ApiError(400, "Identifiant article invalide.");
    }
    filter.article = new mongoose.Types.ObjectId(req.query.article);
  }
  if (req.query.startDate || req.query.endDate) {
    filter.date = {};
    if (req.query.startDate) filter.date.$gte = parseDate(req.query.startDate, "startDate");
    if (req.query.endDate) filter.date.$lte = parseDate(req.query.endDate, "endDate", true);
  }

  const [losses, total, summary] = await Promise.all([
    Loss.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    Loss.countDocuments(filter),
    Loss.aggregate([
      { $match: filter },
      { $group: { _id: null, totalValue: { $sum: "$totalCost" }, count: { $sum: 1 } } },
    ]),
  ]);

  res.json({
    success: true,
    ...paged(losses, total, { page, limit }),
    summary: summary[0] || { totalValue: 0, count: 0 },
  });
});

/**
 * POST /api/losses
 * Déclare une perte : décrémente le stock et enregistre la valeur
 * de la perte au prix d'achat.
 */
export const createLoss = asyncHandler(async (req, res) => {
  const { articleId, quantity, type = "other", reason = "", date } = req.body;
  const qty = Number(quantity);

  if (!articleId) throw new ApiError(400, "L'article est requis.");
  if (!Number.isInteger(qty) || qty <= 0) {
    throw new ApiError(400, "La quantité doit être un entier strictement positif.");
  }

  const session = await mongoose.startSession();
  let loss;
  try {
    await session.withTransaction(async () => {
      const article = await Article.findOneAndUpdate(
        { _id: articleId, active: true, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
        { returnDocument: "before", session }
      );

      if (!article) {
        const exists = await Article.findById(articleId).session(session);
        if (!exists) throw new ApiError(404, "Article introuvable.");
        throw new ApiError(
          400,
          `Stock insuffisant pour ${exists.name} (disponible : ${exists.stock}).`
        );
      }

      const totalCost = money(article.purchasePrice * qty);
      const lossDate = date ? parseDate(date, "date") : new Date();

      [loss] = await Loss.create(
        [
          {
            article: article._id,
            articleName: article.name,
            quantity: qty,
            type,
            reason,
            unitCost: article.purchasePrice,
            totalCost,
            date: lossDate,
            createdBy: req.user._id,
            createdByName: req.user.name,
          },
        ],
        { session }
      );

      await StockMovement.create(
        [
          {
            article: article._id,
            articleName: article.name,
            type: "loss",
            quantity: -qty,
            previousStock: article.stock,
            newStock: article.stock - qty,
            reason: reason || "Perte déclarée",
            referenceType: "loss",
            referenceId: loss._id,
            user: req.user._id,
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  res.status(201).json({ success: true, loss });
});
