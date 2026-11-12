import { connectDatabase, disconnectDatabase } from "../config/db.js";
import { User } from "../models/User.js";
import { Article } from "../models/Article.js";
import { Customer } from "../models/Customer.js";
import { CreditTransaction } from "../models/CreditTransaction.js";
import { Expense } from "../models/Expense.js";
import { StockMovement } from "../models/StockMovement.js";
import { Sale } from "../models/Sale.js";
import { nextSequence } from "../models/Counter.js";
import { money } from "../utils/ApiError.js";

const DEMO = process.env.SEED_DEMO === "true";

async function upsertAdmin() {
  const username = (process.env.ADMIN_USERNAME || "cherif").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const name = process.env.ADMIN_NAME || "Administrateur";

  let user = await User.findOne({ username });
  if (user) {
    console.log(`ℹ️  Administrateur existant : ${username}`);
    return user;
  }

  user = await User.create({
    name,
    username,
    password,
    role: "admin",
    active: true,
  });
  console.log(`✅ Administrateur créé : ${username}`);
  return user;
}

async function seedDemo(admin) {
  if ((await Article.countDocuments()) > 0) {
    console.log("ℹ️  Articles déjà présents, données de démo ignorées.");
    return;
  }

  const articlesData = [
    { name: "Sac de riz 25 kg", category: "Alimentation", purchasePrice: 12000, salePrice: 14500, stock: 40, alertThreshold: 8, unit: "sac" },
    { name: "Huile végétale 5 L", category: "Alimentation", purchasePrice: 5500, salePrice: 6500, stock: 30, alertThreshold: 6, unit: "bidon" },
    { name: "Savon de Marseille", category: "Hygiène", purchasePrice: 600, salePrice: 900, stock: 120, alertThreshold: 20, unit: "pièce" },
    { name: "Détergent 1 kg", category: "Hygiène", purchasePrice: 1800, salePrice: 2400, stock: 45, alertThreshold: 10, unit: "paquet" },
    { name: "Boisson gazeuse 1,5 L", category: "Boissons", purchasePrice: 700, salePrice: 1000, stock: 96, alertThreshold: 24, unit: "bouteille" },
    { name: "Eau minérale 10 L", category: "Boissons", purchasePrice: 1200, salePrice: 1700, stock: 25, alertThreshold: 10, unit: "bidon" },
    { name: "Cahier 200 pages", category: "Papeterie", purchasePrice: 450, salePrice: 750, stock: 80, alertThreshold: 15, unit: "pièce" },
    { name: "Stylo bleu", category: "Papeterie", purchasePrice: 100, salePrice: 250, stock: 150, alertThreshold: 30, unit: "pièce" },
  ];

  const articles = await Article.insertMany(
    articlesData.map((article) => ({ ...article, createdBy: admin._id }))
  );

  await StockMovement.insertMany(
    articles.map((article) => ({
      article: article._id,
      articleName: article.name,
      type: "initial",
      quantity: article.stock,
      previousStock: 0,
      newStock: article.stock,
      reason: "Stock initial (démo)",
      referenceType: "seed",
      user: admin._id,
    }))
  );

  const customers = await Customer.insertMany([
    {
      name: "Aïssatou Ndiaye",
      phone: "+221 77 111 22 33",
      address: "Médina, Dakar",
      creditLimit: 100000,
      createdBy: admin._id,
    },
    {
      name: "Mamadou Diallo",
      phone: "+221 76 444 55 66",
      address: "Parcelles Assainies",
      creditLimit: 50000,
      createdBy: admin._id,
    },
    {
      name: "Fatou Sarr",
      phone: "+221 70 777 88 99",
      address: "Yoff",
      creditLimit: 75000,
      createdBy: admin._id,
    },
  ]);

  await Expense.insertMany([
    {
      label: "Carburant livraison",
      category: "fuel",
      amount: 15000,
      createdBy: admin._id,
      createdByName: admin.name,
    },
    {
      label: "Salaire vendeur",
      category: "salary",
      amount: 75000,
      createdBy: admin._id,
      createdByName: admin.name,
    },
    {
      label: "Livraison fournisseur",
      category: "delivery",
      amount: 10000,
      createdBy: admin._id,
      createdByName: admin.name,
    },
  ]);

  // Deux ventes de démonstration (une comptant, une à crédit)
  const now = new Date();
  const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;

  async function makeSale({ items, customer, paymentType, amountPaid, daysAgo = 0 }) {
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const saleItems = [];
    let subtotal = 0;
    let totalCost = 0;
    for (const { article, quantity } of items) {
      const lineTotal = money(article.salePrice * quantity);
      subtotal += lineTotal;
      totalCost += money(article.purchasePrice * quantity);
      saleItems.push({
        article: article._id,
        name: article.name,
        sku: article.sku || "",
        quantity,
        unitPrice: article.salePrice,
        purchasePrice: article.purchasePrice,
        lineTotal,
        lineProfit: money(lineTotal - article.purchasePrice * quantity),
      });
    }

    const balanceDue = money(subtotal - amountPaid);
    const finalPaid = paymentType === "cash" ? money(subtotal) : amountPaid;
    const finalBalance = money(subtotal - finalPaid);
    const saleSeq = await nextSequence(`sale-${ymd}`);
    const invoiceSeq = await nextSequence(`invoice-${now.getFullYear()}`);

    const sale = await Sale.create({
      reference: `V-${ymd}-${String(saleSeq).padStart(4, "0")}`,
      invoiceNumber: `F-${now.getFullYear()}-${String(invoiceSeq).padStart(6, "0")}`,
      customer: customer?._id || null,
      customerName: customer?.name || "Client de passage",
      items: saleItems,
      subtotal: money(subtotal),
      total: money(subtotal),
      totalCost: money(totalCost),
      grossProfit: money(subtotal - totalCost),
      paymentType,
      amountPaid: finalPaid,
      balanceDue: finalBalance,
      paymentStatus: finalBalance === 0 ? "paid" : finalPaid > 0 ? "partial" : "unpaid",
      soldBy: admin._id,
      soldByName: admin.name,
      createdAt: date,
      updatedAt: date,
    });

    for (const item of saleItems) {
      const article = articles.find((a) => a._id.equals(item.article));
      const previousStock = article.stock;
      article.stock -= item.quantity;
      await article.save();
      await StockMovement.create({
        article: item.article,
        articleName: item.name,
        type: "sale",
        quantity: -item.quantity,
        previousStock,
        newStock: article.stock,
        reason: `Vente ${sale.reference} (démo)`,
        referenceType: "sale",
        referenceId: sale._id,
        user: admin._id,
        createdAt: date,
      });
    }

    if (customer && finalBalance > 0) {
      customer.balance = money(customer.balance + finalBalance);
      await customer.save();
      await CreditTransaction.create({
        customer: customer._id,
        sale: sale._id,
        type: "charge",
        amount: finalBalance,
        balanceAfter: customer.balance,
        note: `Vente à crédit ${sale.reference} (démo)`,
        createdBy: admin._id,
        createdAt: date,
      });
    }
  }

  await makeSale({
    items: [
      { article: articles[0], quantity: 2 },
      { article: articles[2], quantity: 5 },
      { article: articles[4], quantity: 6 },
    ],
    customer: customers[0],
    paymentType: "cash",
    amountPaid: 38150,
    daysAgo: 1,
  });

  await makeSale({
    items: [
      { article: articles[1], quantity: 2 },
      { article: articles[3], quantity: 3 },
      { article: articles[5], quantity: 2 },
    ],
    customer: customers[1],
    paymentType: "credit",
    amountPaid: 10000,
    daysAgo: 0,
  });

  console.log("✅ Données de démonstration créées (articles, clients, dépenses, ventes).");
}

async function run() {
  try {
    await connectDatabase();
    const admin = await upsertAdmin();
    if (DEMO) await seedDemo(admin);
    console.log("\n🎉 Initialisation terminée.");
    console.log(`   Identifiant : ${process.env.ADMIN_USERNAME || "cherif"}`);
    console.log(`   Mot de passe : ${process.env.ADMIN_PASSWORD || "admin123"}`);
  } catch (error) {
    console.error("❌ Seed échoué :", error);
    process.exitCode = 1;
  } finally {
    await disconnectDatabase();
  }
}

run();
