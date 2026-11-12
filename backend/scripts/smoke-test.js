/**
 * Test de fumée de l'API SAHAL SHOP.
 *
 * Le script utilise une base MongoDB réelle (Atlas) mais ne touche pas aux
 * données existantes : chaque enregistrement créé est supprimé à la fin.
 *
 * Usage : npm run smoke
 */
process.env.NODE_ENV = "test";

const { default: request } = await import("supertest");
const { default: app } = await import("../src/app.js");
const { connectDatabase, disconnectDatabase } = await import("../src/config/db.js");
const { env } = await import("../src/config/env.js");
const { Article } = await import("../src/models/Article.js");
const { CreditTransaction } = await import("../src/models/CreditTransaction.js");
const { Customer } = await import("../src/models/Customer.js");
const { Expense } = await import("../src/models/Expense.js");
const { Loss } = await import("../src/models/Loss.js");
const { Sale } = await import("../src/models/Sale.js");
const { StockMovement } = await import("../src/models/StockMovement.js");
const { User } = await import("../src/models/User.js");

const stamp = Date.now().toString(36);
const today = new Date().toISOString().slice(0, 10);
const created = {};
let checks = 0;

function ok(condition, label) {
  if (!condition) throw new Error(`Échec : ${label}`);
  checks += 1;
  console.log(`  ✓ ${label}`);
}

function auth(token) {
  return { Authorization: `Bearer ${token}` };
}

async function cleanup() {
  try {
    if (created.customerId) {
      await CreditTransaction.deleteMany({ customer: created.customerId });
      await Customer.deleteOne({ _id: created.customerId });
    }
    if (created.saleId) {
      await CreditTransaction.deleteMany({ sale: created.saleId });
      await Sale.deleteOne({ _id: created.saleId });
    }
    if (created.articleId) {
      await StockMovement.deleteMany({ article: created.articleId });
      await Loss.deleteMany({ article: created.articleId });
      await Article.deleteOne({ _id: created.articleId });
    }
    if (created.expenseId) {
      await Expense.deleteOne({ _id: created.expenseId });
    }
    if (created.userId) {
      await User.deleteOne({ _id: created.userId });
    }
    await User.deleteOne({ username: `smoke_${stamp}` });
  } catch (error) {
    console.error("⚠️  Nettoyage partiel :", error.message);
  }
}

async function main() {
  console.log("\n🧪 Test de fumée SAHAL SHOP\n");
  await connectDatabase();

  const health = await request(app).get("/api/health").expect(200);
  ok(health.body.success === true, "GET /api/health");
  ok(health.body.shop === env.shop.name, "Nom de la boutique exposé");

  const badLogin = await request(app)
    .post("/api/auth/login")
    .send({ username: env.shop.name, password: "mauvais" })
    .expect(401);
  ok(badLogin.body.success === false, "Connexion invalide refusée");

  const login = await request(app)
    .post("/api/auth/login")
    .send({
      username: process.env.ADMIN_USERNAME || "cherif",
      password: process.env.ADMIN_PASSWORD || "admin123",
    })
    .expect(200);

  const token = login.body.token;
  ok(Boolean(token), "Connexion administrateur");
  ok(login.body.user?.role === "admin", "Rôle administrateur");

  const me = await request(app).get("/api/auth/me").set(auth(token)).expect(200);
  ok(me.body.user?.username === (process.env.ADMIN_USERNAME || "cherif"), "GET /api/auth/me");

  await request(app).get("/api/meta").set(auth(token)).expect(200);
  ok(true, "GET /api/meta");

  const userRes = await request(app)
    .post("/api/users")
    .set(auth(token))
    .send({
      name: "Employé Smoke",
      username: `smoke_${stamp}`,
      password: "x",
      role: "employee",
    })
    .expect(201);
  created.userId = userRes.body.user?._id;
  ok(Boolean(created.userId), "Création d'un employé (mot de passe libre)");

  const updatedUser = await request(app)
    .put(`/api/users/${created.userId}`)
    .set(auth(token))
    .send({ phone: "+221 70 000 00 00", name: "Employé Smoke Modifié" })
    .expect(200);
  ok(updatedUser.body.user?.name === "Employé Smoke Modifié", "Modification d'un employé");

  await request(app).delete(`/api/users/${created.userId}`).set(auth(token)).expect(200);
  created.userId = null;
  ok(true, "Suppression d'un employé");

  const articleRes = await request(app)
    .post("/api/articles")
    .set(auth(token))
    .send({
      name: `Article Smoke ${stamp}`,
      sku: `SMOKE-${stamp}`,
      category: "Test",
      purchasePrice: 1000,
      salePrice: 1500,
      stock: 10,
      alertThreshold: 2,
      unit: "pièce",
    })
    .expect(201);
  created.articleId = articleRes.body.article?._id;
  ok(Boolean(created.articleId), "Création d'un article");
  ok(articleRes.body.article?.stock === 10, "Stock initial de l'article");

  const stockRes = await request(app)
    .post(`/api/articles/${created.articleId}/stock`)
    .set(auth(token))
    .send({ mode: "in", quantity: 2, reason: "Entrée smoke" })
    .expect(200);
  ok(stockRes.body.article?.stock === 12, "Ajustement de stock (+2)");

  const customerRes = await request(app)
    .post("/api/customers")
    .set(auth(token))
    .send({
      name: `Client Smoke ${stamp}`,
      phone: `+221 77 ${String(Date.now()).slice(-7)}`,
      address: "Dakar",
      creditLimit: 100000,
    })
    .expect(201);
  created.customerId = customerRes.body.customer?._id;
  ok(Boolean(created.customerId), "Création d'un client");

  const saleRes = await request(app)
    .post("/api/sales")
    .set(auth(token))
    .send({
      items: [{ articleId: created.articleId, quantity: 3 }],
      customerId: created.customerId,
      paymentType: "credit",
      amountPaid: 1000,
      note: "Vente smoke",
    })
    .expect(201);

  const sale = saleRes.body.sale;
  created.saleId = sale?._id;
  ok(Boolean(created.saleId), "Création d'une vente à crédit");
  ok(sale.invoiceNumber?.startsWith("F-"), "Numéro de facture unique généré");
  ok(sale.total === 4500, "Total de la vente (3 × 1 500)");
  ok(sale.balanceDue === 3500, "Dette client calculée");

  const afterSale = await request(app)
    .get(`/api/articles/${created.articleId}`)
    .set(auth(token))
    .expect(200);
  ok(afterSale.body.article?.stock === 9, "Stock décrémenté après la vente");

  const invoice = await request(app)
    .get(`/api/sales/${created.saleId}/invoice`)
    .set(auth(token))
    .expect(200)
    .expect("Content-Type", /application\/pdf/);

  const pdf = invoice.body;
  ok(
    Buffer.isBuffer(pdf) && pdf.length > 1500 && pdf.subarray(0, 4).toString() === "%PDF",
    "Facture PDF téléchargeable"
  );

  const paymentRes = await request(app)
    .post(`/api/customers/${created.customerId}/payments`)
    .set(auth(token))
    .send({ amount: 500, method: "cash", note: "Remboursement partiel smoke" })
    .expect(201);
  ok(paymentRes.body.customer?.balance === 3000, "Remboursement partiel de la dette");

  const ledger = await request(app)
    .get(`/api/customers/${created.customerId}/ledger`)
    .set(auth(token))
    .expect(200);
  ok(
    Array.isArray(ledger.body.transactions) && ledger.body.transactions.length >= 2,
    "Journal du client (charge + paiement)"
  );

  const expenseRes = await request(app)
    .post("/api/expenses")
    .set(auth(token))
    .send({
      label: "Carburant smoke",
      category: "fuel",
      amount: 2000,
      paymentMethod: "cash",
    })
    .expect(201);
  created.expenseId = expenseRes.body.expense?._id;
  ok(Boolean(created.expenseId), "Création d'une dépense carburant");

  const lossRes = await request(app)
    .post("/api/losses")
    .set(auth(token))
    .send({
      articleId: created.articleId,
      quantity: 1,
      type: "damage",
      reason: "Casse smoke",
    })
    .expect(201);
  ok(lossRes.body.loss?.totalCost === 1000, "Perte valorisée au prix d'achat");

  const dashboard = await request(app)
    .get(`/api/dashboard?startDate=${today}&endDate=${today}`)
    .set(auth(token))
    .expect(200);

  ok(Boolean(dashboard.body.periods?.today), "Dashboard : périodes prédéfinies");
  ok(typeof dashboard.body.finance?.revenue === "number", "Dashboard : chiffre d'affaires");
  ok(dashboard.body.finance?.revenue >= 4500, "Dashboard : vente smoke incluse");
  ok(dashboard.body.finance?.totalExpenses >= 2000, "Dashboard : dépenses incluses");
  ok(dashboard.body.finance?.totalLosses >= 1000, "Dashboard : pertes incluses");
  ok(Array.isArray(dashboard.body.salesSeries), "Dashboard : série journalière");

  const quick = await request(app).get("/api/dashboard/quick").set(auth(token)).expect(200);
  ok(typeof quick.body.totalReceivables === "number", "Dashboard rapide");

  const cancel = await request(app)
    .post(`/api/sales/${created.saleId}/cancel`)
    .set(auth(token))
    .send({ reason: "Annulation smoke" })
    .expect(200);
  ok(cancel.body.sale?.status === "cancelled", "Annulation de la vente");

  const afterCancel = await request(app)
    .get(`/api/articles/${created.articleId}`)
    .set(auth(token))
    .expect(200);
  ok(afterCancel.body.article?.stock === 11, "Stock restauré après annulation");

  const customerAfterCancel = await request(app)
    .get(`/api/customers/${created.customerId}`)
    .set(auth(token))
    .expect(200);
  ok(customerAfterCancel.body.customer?.balance === 0, "Dette annulée avec la vente");

  await request(app)
    .delete(`/api/customers/${created.customerId}`)
    .set(auth(token))
    .expect(200);
  created.customerId = null;
  ok(true, "Suppression d'un client sans dette");

  await request(app)
    .delete(`/api/expenses/${created.expenseId}`)
    .set(auth(token))
    .expect(200);
  created.expenseId = null;
  ok(true, "Suppression d'une dépense");

  await request(app)
    .delete(`/api/articles/${created.articleId}`)
    .set(auth(token))
    .expect(200);
  ok(true, "Archivage d'un article");

  console.log(`\n✅ ${checks} vérifications réussies. API opérationnelle.\n`);
}

try {
  await main();
  process.exitCode = 0;
} catch (error) {
  console.error("\n❌ Test de fumée échoué :\n", error);
  process.exitCode = 1;
} finally {
  await cleanup();
  await disconnectDatabase();
}
