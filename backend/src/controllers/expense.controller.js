import { Expense, EXPENSE_CATEGORIES } from "../models/Expense.js";
import { ApiError, asyncHandler, money } from "../utils/ApiError.js";
import { paged, pagination } from "../utils/pagination.js";
import { parseDate } from "../utils/dates.js";

export const EXPENSE_LABELS = {
  fuel: "Carburant",
  salary: "Salaire employé",
  delivery: "Frais de livraison",
  rent: "Loyer",
  utilities: "Eau / Électricité",
  supplies: "Fournitures",
  maintenance: "Maintenance",
  tax: "Taxes",
  other: "Autre",
};

/** GET /api/expenses */
export const listExpenses = asyncHandler(async (req, res) => {
  const { page, limit, skip } = pagination(req.query);
  const filter = {};

  if (req.query.category) filter.category = req.query.category;
  if (req.query.startDate || req.query.endDate) {
    filter.date = {};
    if (req.query.startDate) filter.date.$gte = parseDate(req.query.startDate, "startDate");
    if (req.query.endDate) filter.date.$lte = parseDate(req.query.endDate, "endDate", true);
  }

  const [expenses, total, summary, byCategory] = await Promise.all([
    Expense.find(filter).sort({ date: -1 }).skip(skip).limit(limit),
    Expense.countDocuments(filter),
    Expense.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Expense.aggregate([
      { $match: filter },
      { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
    ]),
  ]);

  res.json({
    success: true,
    ...paged(expenses, total, { page, limit }),
    summary: summary[0] || { total: 0, count: 0 },
    byCategory: byCategory.map((entry) => ({
      ...entry,
      label: EXPENSE_LABELS[entry._id] || entry._id,
    })),
  });
});

/** GET /api/expenses/categories */
export const listExpenseCategories = (_req, res) => {
  res.json({
    success: true,
    data: EXPENSE_CATEGORIES.map((value) => ({
      value,
      label: EXPENSE_LABELS[value],
    })),
  });
};

/** POST /api/expenses */
export const createExpense = asyncHandler(async (req, res) => {
  const {
    label,
    category = "other",
    amount,
    date,
    paymentMethod = "cash",
    note = "",
    receiptUrl = "",
  } = req.body;

  if (!label) throw new ApiError(400, "Le libellé est requis.");
  if (!amount || Number(amount) <= 0) {
    throw new ApiError(400, "Le montant doit être positif.");
  }
  if (!EXPENSE_CATEGORIES.includes(category)) {
    throw new ApiError(400, "Catégorie de dépense invalide.");
  }

  const expense = await Expense.create({
    label,
    category,
    amount: money(amount),
    date: date ? parseDate(date, "date") : new Date(),
    paymentMethod,
    note,
    receiptUrl,
    createdBy: req.user._id,
    createdByName: req.user.name,
  });

  res.status(201).json({ success: true, expense });
});

/** PUT /api/expenses/:id */
export const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) throw new ApiError(404, "Dépense introuvable.");

  const { label, category, amount, date, paymentMethod, note, receiptUrl } = req.body;

  if (category && !EXPENSE_CATEGORIES.includes(category)) {
    throw new ApiError(400, "Catégorie de dépense invalide.");
  }
  if (amount !== undefined && Number(amount) <= 0) {
    throw new ApiError(400, "Le montant doit être positif.");
  }

  if (label !== undefined) expense.label = label;
  if (category !== undefined) expense.category = category;
  if (amount !== undefined) expense.amount = money(amount);
  if (date !== undefined) expense.date = parseDate(date, "date");
  if (paymentMethod !== undefined) expense.paymentMethod = paymentMethod;
  if (note !== undefined) expense.note = note;
  if (receiptUrl !== undefined) expense.receiptUrl = receiptUrl;

  await expense.save();
  res.json({ success: true, expense });
});

/** DELETE /api/expenses/:id */
export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findByIdAndDelete(req.params.id);
  if (!expense) throw new ApiError(404, "Dépense introuvable.");
  res.json({ success: true, message: "Dépense supprimée." });
});
