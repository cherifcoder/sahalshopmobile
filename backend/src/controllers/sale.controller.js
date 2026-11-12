import mongoose from "mongoose";
import { Article } from "../models/Article.js";
import { Customer } from "../models/Customer.js";
import { CreditTransaction } from "../models/CreditTransaction.js";
import { Sale } from "../models/Sale.js";
import { StockMovement } from "../models/StockMovement.js";
import { nextSequence } from "../models/Counter.js";
import { ApiError, asyncHandler, escapeRegex, money } from "../utils/ApiError.js";
import { paged, pagination } from "../utils/pagination.js";
import { parseDate } from "../utils/dates.js";
import { streamInvoicePdf } from "../services/invoice.service.js";

/** Construit un filtre de ventes à partir des query params. */
function saleFilter(query) {
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.paymentType) filter.paymentType = query.paymentType;
  if (query.customer) {
    if (!mongoose.isValidObjectId(query.customer)) {
      throw new ApiError(400, "Identifiant client invalide.");
    }
    filter.customer = new mongoose.Types.ObjectId(query.customer);
  }

  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) filter.createdAt.$gte = parseDate(query.startDate, "startDate");
    if (query.endDate) filter.createdAt.$lte = parseDate(query.endDate, "endDate", true);
  }

  if (query.q) {
    const regex = new RegExp(escapeRegex(query.q), "i");
    filter.$or = [{ reference: regex }, { invoiceNumber: regex }, { customerName: regex }];
  }
  return filter;
}

/**
 * POST /api/sales
 * Crée une vente, décrémente le stock de façon atomique,
 * enregistre la dette éventuelle et génère un numéro de facture.
 *
 * body: {
 *   items: [{ articleId, quantity, unitPrice? }],
 *   customerId?, paymentType: cash|credit|mobile_money,
 *   amountPaid?, discount?, note?
 * }
 */
export const createSale = asyncHandler(async (req, res) => {
  const {
    items,
    customerId = null,
    paymentType = "cash",
    amountPaid = 0,
    discount = 0,
    note = "",
  } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(400, "La vente doit contenir au moins un article.");
  }
  if (!["cash", "credit", "mobile_money"].includes(paymentType)) {
    throw new ApiError(400, "Mode de paiement invalide.");
  }
  if (paymentType === "credit" && !customerId) {
    throw new ApiError(400, "Un client est obligatoire pour une vente à crédit.");
  }

  const seen = new Set();
  for (const item of items) {
    if (!item.articleId) throw new ApiError(400, "Chaque ligne doit référencer un article.");
    if (seen.has(String(item.articleId))) {
      throw new ApiError(400, "Un article ne peut apparaître qu'une seule fois dans la vente.");
    }
    seen.add(String(item.articleId));
    if (!Number.isInteger(Number(item.quantity)) || Number(item.quantity) <= 0) {
      throw new ApiError(400, "Les quantités doivent être des entiers strictement positifs.");
    }
  }

  const session = await mongoose.startSession();
  let sale;

  try {
    await session.withTransaction(async () => {
      const articleIds = items.map((item) => item.articleId);
      const articles = await Article.find({
        _id: { $in: articleIds },
        active: true,
      }).session(session);

      if (articles.length !== articleIds.length) {
        throw new ApiError(400, "Un ou plusieurs articles sont introuvables ou archivés.");
      }

      const articleMap = new Map(articles.map((a) => [String(a._id), a]));
      const saleItems = [];
      let subtotal = 0;
      let totalCost = 0;

      for (const item of items) {
        const article = articleMap.get(String(item.articleId));
        const quantity = Number(item.quantity);
        const unitPrice =
          item.unitPrice !== undefined
            ? money(item.unitPrice)
            : money(article.salePrice);

        if (unitPrice < 0) throw new ApiError(400, "Le prix unitaire ne peut pas être négatif.");

        const lineTotal = money(unitPrice * quantity);
        const lineProfit = money((unitPrice - article.purchasePrice) * quantity);
        subtotal = money(subtotal + lineTotal);
        totalCost = money(totalCost + article.purchasePrice * quantity);

        saleItems.push({
          article: article._id,
          name: article.name,
          sku: article.sku || "",
          quantity,
          unitPrice,
          purchasePrice: article.purchasePrice,
          lineTotal,
          lineProfit,
        });
      }

      const saleDiscount = money(discount);
      if (saleDiscount < 0 || saleDiscount > subtotal) {
        throw new ApiError(400, "La remise doit être comprise entre 0 et le sous-total.");
      }
      const total = money(subtotal - saleDiscount);

      const paid = paymentType === "credit" ? money(amountPaid) : total;
      if (paid < 0 || paid > total) {
        throw new ApiError(400, "Le montant réglé doit être compris entre 0 et le total.");
      }
      const balanceDue = money(total - paid);
      const paymentStatus = balanceDue === 0 ? "paid" : paid > 0 ? "partial" : "unpaid";

      // Client (facultatif au comptant, obligatoire à crédit)
      let customer = null;
      if (customerId) {
        customer = await Customer.findOne({ _id: customerId, active: true }).session(session);
        if (!customer) throw new ApiError(404, "Client introuvable ou archivé.");
      }

      if (paymentType === "credit" && balanceDue > 0 && customer.creditLimit > 0) {
        if (customer.balance + balanceDue > customer.creditLimit) {
          throw new ApiError(
            400,
            `Limite de crédit dépassée (plafond : ${customer.creditLimit}, dette actuelle : ${customer.balance}).`
          );
        }
      }

      const now = new Date();
      const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
        now.getDate()
      ).padStart(2, "0")}`;
      const saleSeq = await nextSequence(`sale-${ymd}`, session);
      const invoiceSeq = await nextSequence(`invoice-${now.getFullYear()}`, session);

      sale = new Sale({
        reference: `V-${ymd}-${String(saleSeq).padStart(4, "0")}`,
        invoiceNumber: `F-${now.getFullYear()}-${String(invoiceSeq).padStart(6, "0")}`,
        customer: customer?._id || null,
        customerName: customer?.name || "Client de passage",
        items: saleItems,
        subtotal,
        discount: saleDiscount,
        total,
        totalCost,
        grossProfit: money(total - totalCost),
        paymentType,
        amountPaid: paid,
        balanceDue,
        paymentStatus,
        note,
        soldBy: req.user._id,
        soldByName: req.user.name,
      });

      // Décrément atomique du stock : impossible de vendre plus que disponible.
      for (const item of saleItems) {
        const previous = await Article.findOneAndUpdate(
          { _id: item.article, active: true, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } },
          { returnDocument: "before", session }
        );

        if (!previous) {
          const current = await Article.findById(item.article).session(session);
          throw new ApiError(
            400,
            `Stock insuffisant pour ${item.name} (disponible : ${current?.stock ?? 0}).`
          );
        }

        await StockMovement.create(
          [
            {
              article: item.article,
              articleName: item.name,
              type: "sale",
              quantity: -item.quantity,
              previousStock: previous.stock,
              newStock: previous.stock - item.quantity,
              reason: `Vente ${sale.reference}`,
              referenceType: "sale",
              referenceId: sale._id,
              user: req.user._id,
            },
          ],
          { session }
        );
      }

      await sale.save({ session });

      // Enregistrement de la dette client
      if (paymentType === "credit" && balanceDue > 0 && customer) {
        const updatedCustomer = await Customer.findOneAndUpdate(
          { _id: customer._id, balance: customer.balance },
          { $inc: { balance: balanceDue } },
          { returnDocument: "after", session }
        );

        if (!updatedCustomer) {
          throw new ApiError(409, "Le solde du client a changé. Réessayez la vente.");
        }

        await CreditTransaction.create(
          [
            {
              customer: updatedCustomer._id,
              sale: sale._id,
              type: "charge",
              amount: balanceDue,
              balanceAfter: updatedCustomer.balance,
              note: `Vente à crédit ${sale.reference}`,
              createdBy: req.user._id,
            },
          ],
          { session }
        );
      }
    });
  } finally {
    await session.endSession();
  }

  const populated = await Sale.findById(sale._id)
    .populate("customer", "name phone balance")
    .populate("soldBy", "name");

  res.status(201).json({ success: true, sale: populated });
});

/** GET /api/sales */
export const listSales = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 30 });
  const filter = saleFilter(req.query);

  const [sales, total, summary] = await Promise.all([
    Sale.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("customer", "name phone balance")
      .populate("soldBy", "name"),
    Sale.countDocuments(filter),
    Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          revenue: { $sum: "$total" },
          revenueCompleted: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, "$total", 0] },
          },
          count: { $sum: 1 },
          credit: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ["$paymentType", "credit"] }, { $eq: ["$status", "completed"] }] },
                "$balanceDue",
                0,
              ],
            },
          },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    ...paged(sales, total, { page, limit }),
    summary: summary[0] || { revenue: 0, revenueCompleted: 0, count: 0, credit: 0 },
  });
});

/** GET /api/sales/:id */
export const getSale = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id)
    .populate("customer", "name phone address balance")
    .populate("soldBy", "name")
    .populate("cancelledBy", "name");
  if (!sale) throw new ApiError(404, "Vente introuvable.");
  res.json({ success: true, sale });
});

/** GET /api/sales/:id/invoice — facture PDF de la vente. */
export const downloadInvoice = asyncHandler(async (req, res) => {
  const sale = await Sale.findById(req.params.id);
  if (!sale) throw new ApiError(404, "Vente introuvable.");
  streamInvoicePdf(sale, res);
});

/** POST /api/sales/:id/cancel (admin) */
export const cancelSale = asyncHandler(async (req, res) => {
  const { reason = "" } = req.body;

  const session = await mongoose.startSession();
  let sale;
  try {
    await session.withTransaction(async () => {
      sale = await Sale.findById(req.params.id).session(session);
      if (!sale) throw new ApiError(404, "Vente introuvable.");
      if (sale.status === "cancelled") throw new ApiError(400, "Cette vente est déjà annulée.");

      // Remise en stock + journal des mouvements
      for (const item of sale.items) {
        const article = await Article.findByIdAndUpdate(
          item.article,
          { $inc: { stock: item.quantity } },
          { returnDocument: "after", session }
        );

        if (article) {
          await StockMovement.create(
            [
              {
                article: article._id,
                articleName: item.name,
                type: "sale_cancel",
                quantity: item.quantity,
                previousStock: article.stock - item.quantity,
                newStock: article.stock,
                reason: `Annulation ${sale.reference}`,
                referenceType: "sale",
                referenceId: sale._id,
                user: req.user._id,
              },
            ],
            { session }
          );
        }
      }

      // Annulation de la dette restante liée à cette vente
      if (sale.customer && sale.balanceDue > 0) {
        const customer = await Customer.findById(sale.customer).session(session);
        if (customer && customer.balance > 0) {
          const amount = money(Math.min(customer.balance, sale.balanceDue));
          const updatedCustomer = await Customer.findOneAndUpdate(
            { _id: customer._id, balance: { $gte: amount } },
            { $inc: { balance: -amount } },
            { returnDocument: "after", session }
          );

          if (updatedCustomer) {
            await CreditTransaction.create(
              [
                {
                  customer: updatedCustomer._id,
                  sale: sale._id,
                  type: "adjustment",
                  amount,
                  balanceAfter: updatedCustomer.balance,
                  note: `Annulation de la vente ${sale.reference}`,
                  createdBy: req.user._id,
                },
              ],
              { session }
            );
          }
        }
      }

      sale.status = "cancelled";
      sale.cancelledAt = new Date();
      sale.cancelledBy = req.user._id;
      sale.cancelReason = reason;
      await sale.save({ session });
    });
  } finally {
    await session.endSession();
  }

  res.json({ success: true, message: "Vente annulée, stock restauré.", sale });
});
