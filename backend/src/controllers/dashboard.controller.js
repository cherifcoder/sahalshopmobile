import { Article } from "../models/Article.js";
import { Customer } from "../models/Customer.js";
import { CreditTransaction } from "../models/CreditTransaction.js";
import { Expense } from "../models/Expense.js";
import { Loss } from "../models/Loss.js";
import { Sale } from "../models/Sale.js";
import { env } from "../config/env.js";
import { asyncHandler, money } from "../utils/ApiError.js";
import { presetRanges, resolveRange } from "../utils/dates.js";
import { EXPENSE_LABELS } from "./expense.controller.js";

/**
 * Calcule tous les indicateurs financiers d'une période.
 * - CA net : total encaissable des ventes terminées (remises déjà déduites)
 * - Bénéfice brut : CA - coût d'achat des articles vendus
 * - Bénéfice net : bénéfice brut - dépenses - pertes
 */
async function periodStats({ start, end }) {
  const completedMatch = {
    status: "completed",
    createdAt: { $gte: start, $lte: end },
  };

  const [salesAgg, expensesAgg, lossesAgg, paymentsAgg] = await Promise.all([
    Sale.aggregate([
      { $match: completedMatch },
      {
        $group: {
          _id: null,
          salesCount: { $sum: 1 },
          revenue: { $sum: "$total" },
          totalCost: { $sum: "$totalCost" },
          grossProfit: { $sum: "$grossProfit" },
          cashCollected: { $sum: "$amountPaid" },
          creditExtended: { $sum: "$balanceDue" },
          discounts: { $sum: "$discount" },
        },
      },
    ]),
    Expense.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
    Loss.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      { $group: { _id: null, total: { $sum: "$totalCost" }, count: { $sum: 1 } } },
    ]),
    CreditTransaction.aggregate([
      {
        $match: {
          type: "payment",
          createdAt: { $gte: start, $lte: end },
        },
      },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]),
  ]);

  const sales = salesAgg[0] || {
    salesCount: 0,
    revenue: 0,
    totalCost: 0,
    grossProfit: 0,
    cashCollected: 0,
    creditExtended: 0,
    discounts: 0,
  };
  const expenses = expensesAgg[0]?.total || 0;
  const losses = lossesAgg[0]?.total || 0;
  const debtPayments = paymentsAgg[0]?.total || 0;

  const revenue = money(sales.revenue);
  const totalCost = money(sales.totalCost);
  const grossProfit = money(sales.grossProfit);
  const totalExpenses = money(expenses);
  const totalLosses = money(losses);
  const netProfit = money(grossProfit - totalExpenses - totalLosses);

  return {
    start,
    end,
    salesCount: sales.salesCount,
    revenue,
    netRevenue: revenue,
    totalCost,
    grossProfit,
    grossMarginRate:
      revenue > 0 ? money((grossProfit / revenue) * 100) : 0,
    cashCollected: money(sales.cashCollected),
    creditExtended: money(sales.creditExtended),
    discounts: money(sales.discounts),
    totalExpenses,
    expenseCount: expensesAgg[0]?.count || 0,
    totalLosses,
    lossCount: lossesAgg[0]?.count || 0,
    netProfit,
    debtPayments: money(debtPayments),
    debtPaymentCount: paymentsAgg[0]?.count || 0,
  };
}

const EMPTY_STATS = {
  salesCount: 0,
  revenue: 0,
  netRevenue: 0,
  totalCost: 0,
  grossProfit: 0,
  grossMarginRate: 0,
  cashCollected: 0,
  creditExtended: 0,
  discounts: 0,
  totalExpenses: 0,
  expenseCount: 0,
  totalLosses: 0,
  lossCount: 0,
  netProfit: 0,
  debtPayments: 0,
  debtPaymentCount: 0,
};

/**
 * GET /api/dashboard?startDate=AAAA-MM-JJ&endDate=AAAA-MM-JJ
 * Retourne les 4 périodes prédéfinies + la période personnalisée,
 * les indicateurs financiers, les meilleures ventes et les alertes de stock.
 */
export const getDashboard = asyncHandler(async (req, res) => {
  const range = resolveRange(req.query);
  const presets = presetRanges();

  const [today, week, month, year, custom, receivables, lowStock, topProducts, expensesByCategory, lossesByType, recentSales, stockSummary] =
    await Promise.all([
      periodStats(presets.today),
      periodStats(presets.week),
      periodStats(presets.month),
      periodStats(presets.year),
      periodStats(range),
      Customer.aggregate([
        { $match: { active: true } },
        {
          $group: {
            _id: null,
            totalReceivables: { $sum: "$balance" },
            debtors: { $sum: { $cond: [{ $gt: ["$balance", 0] }, 1, 0] } },
            customers: { $sum: 1 },
          },
        },
      ]),
      Article.find({
        active: true,
        $expr: { $lte: ["$stock", "$alertThreshold"] },
      })
        .sort({ stock: 1 })
        .limit(10)
        .select("name sku stock alertThreshold unit salePrice purchasePrice"),
      Sale.aggregate([
        {
          $match: {
            status: "completed",
            createdAt: { $gte: range.start, $lte: range.end },
          },
        },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.article",
            name: { $first: "$items.name" },
            quantity: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.lineTotal" },
            profit: { $sum: "$items.lineProfit" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 8 },
      ]),
      Expense.aggregate([
        { $match: { date: { $gte: range.start, $lte: range.end } } },
        { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Loss.aggregate([
        { $match: { date: { $gte: range.start, $lte: range.end } } },
        { $group: { _id: "$type", total: { $sum: "$totalCost" }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      Sale.find({ status: "completed" })
        .sort({ createdAt: -1 })
        .limit(8)
        .select("reference invoiceNumber customerName total paymentType createdAt"),
      Article.aggregate([
        { $match: { active: true } },
        {
          $group: {
            _id: null,
            stockValue: { $sum: { $multiply: ["$stock", "$purchasePrice"] } },
            potentialRevenue: { $sum: { $multiply: ["$stock", "$salePrice"] } },
            units: { $sum: "$stock" },
          },
        },
      ]),
    ]);

  // Série journalière (ou mensuelle si la plage dépasse 62 jours)
  const dayCount = Math.ceil((range.end - range.start) / (24 * 60 * 60 * 1000));
  const seriesFormat = dayCount > 62 ? "%Y-%m" : "%Y-%m-%d";

  const salesSeries = await Sale.aggregate([
    {
      $match: {
        status: "completed",
        createdAt: { $gte: range.start, $lte: range.end },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: {
            format: seriesFormat,
            date: "$createdAt",
            timezone: env.timezone,
          },
        },
        revenue: { $sum: "$total" },
        profit: { $sum: "$grossProfit" },
        salesCount: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const receivable = receivables[0] || {
    totalReceivables: 0,
    debtors: 0,
    customers: 0,
  };
  const stock = stockSummary[0] || {
    stockValue: 0,
    potentialRevenue: 0,
    units: 0,
  };

  res.json({
    success: true,
    generatedAt: new Date(),
    range,
    periods: {
      today: today || { ...EMPTY_STATS, ...presets.today },
      week: week || { ...EMPTY_STATS, ...presets.week },
      month: month || { ...EMPTY_STATS, ...presets.month },
      year: year || { ...EMPTY_STATS, ...presets.year },
      custom,
    },
    finance: {
      revenue: custom.revenue,
      netRevenue: custom.netRevenue,
      totalCost: custom.totalCost,
      grossProfit: custom.grossProfit,
      grossMarginRate: custom.grossMarginRate,
      totalExpenses: custom.totalExpenses,
      totalLosses: custom.totalLosses,
      netProfit: custom.netProfit,
      cashCollected: custom.cashCollected,
      creditExtended: custom.creditExtended,
      debtPayments: custom.debtPayments,
      totalReceivables: money(receivable.totalReceivables),
      debtors: receivable.debtors,
      customers: receivable.customers,
      stockValue: money(stock.stockValue),
      potentialRevenue: money(stock.potentialRevenue),
      stockUnits: stock.units,
    },
    topProducts,
    expensesByCategory: expensesByCategory.map((entry) => ({
      ...entry,
      label: EXPENSE_LABELS[entry._id] || entry._id,
    })),
    lossesByType,
    recentSales,
    lowStock,
    salesSeries,
    shop: env.shop,
  });
});

/** GET /api/dashboard/quick — version légère pour le rafraîchissement fréquent. */
export const getQuickStats = asyncHandler(async (_req, res) => {
  const presets = presetRanges();
  const [today, month, receivable] = await Promise.all([
    periodStats(presets.today),
    periodStats(presets.month),
    Customer.aggregate([
      { $match: { active: true } },
      {
        $group: {
          _id: null,
          totalReceivables: { $sum: "$balance" },
          debtors: { $sum: { $cond: [{ $gt: ["$balance", 0] }, 1, 0] } },
        },
      },
    ]),
  ]);

  res.json({
    success: true,
    generatedAt: new Date(),
    today,
    month,
    totalReceivables: money(receivable[0]?.totalReceivables || 0),
    debtors: receivable[0]?.debtors || 0,
  });
});
