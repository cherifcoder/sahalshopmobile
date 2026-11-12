import mongoose from "mongoose";
import { Customer } from "../models/Customer.js";
import { CreditTransaction } from "../models/CreditTransaction.js";
import { Sale } from "../models/Sale.js";
import { ApiError, asyncHandler, escapeRegex, money } from "../utils/ApiError.js";
import { paged, pagination } from "../utils/pagination.js";

/** GET /api/customers */
export const listCustomers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query, { defaultLimit: 100 });
  const filter = {};

  if (req.query.includeInactive !== "true") filter.active = true;
  if (req.query.hasDebt === "true") filter.balance = { $gt: 0 };
  if (req.query.q) {
    const regex = new RegExp(escapeRegex(req.query.q), "i");
    filter.$or = [{ name: regex }, { phone: regex }, { address: regex }];
  }

  const [customers, total, summary] = await Promise.all([
    Customer.find(filter).sort({ balance: -1, name: 1 }).skip(skip).limit(limit),
    Customer.countDocuments(filter),
    Customer.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: null,
          totalReceivables: { $sum: "$balance" },
          debtors: { $sum: { $cond: [{ $gt: ["$balance", 0] }, 1, 0] } },
          totalCustomers: { $sum: 1 },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    ...paged(customers, total, { page, limit }),
    summary: summary[0] || { totalReceivables: 0, debtors: 0, totalCustomers: 0 },
  });
});

/** GET /api/customers/:id */
export const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError(404, "Client introuvable.");

  const [transactions, sales] = await Promise.all([
    CreditTransaction.find({ customer: customer._id })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("sale", "reference invoiceNumber total"),
    Sale.find({ customer: customer._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .select("reference invoiceNumber total paymentType balanceDue status createdAt"),
  ]);

  res.json({ success: true, customer, transactions, sales });
});

/** POST /api/customers */
export const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, address = "", creditLimit = 0, notes = "" } = req.body;

  if (!name) throw new ApiError(400, "Le nom du client est requis.");
  if (Number(creditLimit) < 0) throw new ApiError(400, "Le plafond de crédit est invalide.");

  const customer = await Customer.create({
    name,
    phone: phone || undefined,
    address,
    creditLimit: money(creditLimit),
    notes,
    createdBy: req.user._id,
  });

  res.status(201).json({ success: true, customer });
});

/** PUT /api/customers/:id */
export const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError(404, "Client introuvable.");

  const { name, phone, address, creditLimit, notes, active } = req.body;

  if (phone !== undefined) customer.phone = phone || undefined;
  if (name !== undefined) customer.name = name;
  if (address !== undefined) customer.address = address;
  if (notes !== undefined) customer.notes = notes;
  if (active !== undefined) customer.active = Boolean(active);
  if (creditLimit !== undefined) {
    if (Number(creditLimit) < 0) throw new ApiError(400, "Plafond de crédit invalide.");
    customer.creditLimit = money(creditLimit);
  }

  await customer.save();
  res.json({ success: true, customer });
});

/** DELETE /api/customers/:id — interdit si le client a encore une dette. */
export const deleteCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError(404, "Client introuvable.");

  if (customer.balance > 0) {
    throw new ApiError(
      400,
      `Impossible de supprimer : le client doit encore ${customer.balance}. Encaissez la dette ou archivez le client.`
    );
  }

  // On conserve les ventes (instantanés de prix + nom du client) mais on détache la référence.
  await Sale.updateMany({ customer: customer._id }, { $set: { customer: null } });
  await CreditTransaction.deleteMany({ customer: customer._id });
  await customer.deleteOne();

  res.json({ success: true, message: "Client supprimé." });
});

/**
 * POST /api/customers/:id/payments
 * Remboursement total ou partiel d'une dette.
 * body : { amount, method?, note? }
 */
export const payCustomerDebt = asyncHandler(async (req, res) => {
  const amount = money(req.body.amount);
  const method = req.body.method || "cash";
  const note = req.body.note || "";

  if (!amount || amount <= 0) {
    throw new ApiError(400, "Le montant du paiement doit être positif.");
  }
  if (!["cash", "mobile_money", "bank", "other"].includes(method)) {
    throw new ApiError(400, "Moyen de paiement invalide.");
  }

  const session = await mongoose.startSession();
  let customer;
  let transaction;
  try {
    await session.withTransaction(async () => {
      const current = await Customer.findById(req.params.id).session(session);
      if (!current) throw new ApiError(404, "Client introuvable.");
      if (current.balance <= 0) throw new ApiError(400, "Ce client n'a aucune dette.");
      if (amount > current.balance) {
        throw new ApiError(
          400,
          `Le paiement dépasse la dette restante (${current.balance}).`
        );
      }

      // Filtre sur le solde : protection contre deux paiements simultanés.
      customer = await Customer.findOneAndUpdate(
        { _id: current._id, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { returnDocument: "after", session }
      );

      if (!customer) {
        throw new ApiError(409, "Le solde a changé. Actualisez puis réessayez.");
      }

      [transaction] = await CreditTransaction.create(
        [
          {
            customer: customer._id,
            type: "payment",
            amount,
            balanceAfter: customer.balance,
            method,
            note,
            createdBy: req.user._id,
          },
        ],
        { session }
      );
    });
  } finally {
    await session.endSession();
  }

  res.status(201).json({
    success: true,
    message: "Paiement enregistré.",
    customer,
    transaction,
  });
});

/** GET /api/customers/:id/ledger */
export const getCustomerLedger = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError(404, "Client introuvable.");

  const transactions = await CreditTransaction.find({ customer: customer._id })
    .sort({ createdAt: -1 })
    .populate("sale", "reference invoiceNumber total")
    .populate("createdBy", "name");

  res.json({ success: true, customer, transactions });
});
