import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PDFDocument from "pdfkit";
import { env } from "../config/env.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.resolve(__dirname, "../../assets/logo.jpeg");

const COLORS = {
  primary: "#01388B",
  gold: "#D4A017",
  light: "#EEF3FB",
  text: "#0F172A",
  muted: "#64748B",
  border: "#E2E8F0",
};

const formatMoney = (value) =>
  `${new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(
    Number(value) || 0
  )} ${env.shop.currencyLabel}`;

const formatDate = (value) =>
  new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

/**
 * Génère la facture PDF d'une vente directement dans la réponse HTTP.
 * Chaque vente possède un numéro de facture unique (invoiceNumber).
 */
export function streamInvoicePdf(sale, res) {
  const doc = new PDFDocument({ size: "A4", margin: 0 });
  const filename = `Facture-${sale.invoiceNumber}.pdf`;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`
  );

  doc.pipe(res);

  const pageWidth = doc.page.width;
  const margin = 42;
  const contentWidth = pageWidth - margin * 2;

  // ---- En-tête ----
  doc.rect(0, 0, pageWidth, 132).fill(COLORS.primary);

  if (fs.existsSync(LOGO_PATH)) {
    try {
      doc.image(LOGO_PATH, margin, 26, { fit: [78, 78], valign: "center" });
    } catch {
      // Le logo ne doit jamais empêcher l'émission de la facture.
    }
  }

  doc
    .fillColor("#FFFFFF")
    .font("Helvetica-Bold")
    .fontSize(24)
    .text(env.shop.name, margin + 94, 34, { width: contentWidth - 94 });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#DCE7FA")
    .text(
      [env.shop.address, env.shop.phone, env.shop.email]
        .filter(Boolean)
        .join("  •  "),
      margin + 94,
      66,
      { width: contentWidth - 94 }
    );

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor("#FFFFFF")
    .text("FACTURE", pageWidth - margin - 150, 92, {
      width: 150,
      align: "right",
    });

  // ---- Bandeau numéro / date ----
  doc.rect(0, 132, pageWidth, 48).fill(COLORS.light);

  doc
    .fillColor(COLORS.primary)
    .font("Helvetica-Bold")
    .fontSize(12)
    .text(`N° ${sale.invoiceNumber}`, margin, 147)
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(`Émise le ${formatDate(sale.createdAt)}`, pageWidth - margin - 210, 150, {
      width: 210,
      align: "right",
    });

  // ---- Client / vente ----
  let y = 202;
  doc
    .fillColor(COLORS.muted)
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("CLIENT", margin, y)
    .text("RÉFÉRENCE", margin + 300, y);

  doc
    .fillColor(COLORS.text)
    .font("Helvetica-Bold")
    .fontSize(11)
    .text(sale.customerName || "Client de passage", margin, y + 14, {
      width: 280,
    });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor(COLORS.muted)
    .text(
      `Vente : ${sale.reference}\nCaissier : ${sale.soldByName || "—"}`,
      margin + 300,
      y + 14,
      { width: 200 }
    );

  y += 58;

  // ---- Tableau ----
  const columns = {
    name: { x: margin, width: 250 },
    qty: { x: margin + 255, width: 45 },
    price: { x: margin + 305, width: 95 },
    total: { x: margin + 405, width: contentWidth - 405 },
  };

  const drawTableHeader = (top) => {
    doc.rect(margin, top, contentWidth, 24).fill(COLORS.primary);
    doc
      .fillColor("#FFFFFF")
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .text("DÉSIGNATION", columns.name.x + 8, top + 8, { width: columns.name.width })
      .text("QTÉ", columns.qty.x, top + 8, {
        width: columns.qty.width,
        align: "center",
      })
      .text("PRIX UNIT.", columns.price.x, top + 8, {
        width: columns.price.width,
        align: "right",
      })
      .text("TOTAL", columns.total.x, top + 8, {
        width: columns.total.width - 8,
        align: "right",
      });
    return top + 24;
  };

  y = drawTableHeader(y);

  sale.items.forEach((item, index) => {
    if (y > 700) {
      doc.addPage();
      doc.rect(0, 0, pageWidth, 24).fill(COLORS.primary);
      y = drawTableHeader(24);
    }

    const rowHeight = 26;
    if (index % 2 === 0) {
      doc.rect(margin, y, contentWidth, rowHeight).fill("#F8FAFC");
    }

    doc
      .fillColor(COLORS.text)
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(item.name, columns.name.x + 8, y + 8, {
        width: columns.name.width - 8,
        lineBreak: false,
        ellipsis: true,
      })
      .font("Helvetica")
      .fontSize(8.5)
      .fillColor(COLORS.text)
      .text(String(item.quantity), columns.qty.x, y + 9, {
        width: columns.qty.width,
        align: "center",
      })
      .text(formatMoney(item.unitPrice), columns.price.x, y + 9, {
        width: columns.price.width,
        align: "right",
      })
      .font("Helvetica-Bold")
      .text(formatMoney(item.lineTotal), columns.total.x, y + 9, {
        width: columns.total.width - 8,
        align: "right",
      });

    y += rowHeight;
    doc
      .moveTo(margin, y)
      .lineTo(pageWidth - margin, y)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();
  });

  // ---- Totaux ----
  y += 14;
  const totalsX = pageWidth - margin - 240;
  const totalLine = (label, value, bold = false, color = COLORS.text) => {
    doc
      .fillColor(color)
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(bold ? 11 : 9)
      .text(label, totalsX, y, { width: 130 })
      .text(value, totalsX + 130, y, { width: 110, align: "right" });
    y += bold ? 20 : 16;
  };

  totalLine("Sous-total", formatMoney(sale.subtotal));
  if (sale.discount > 0) {
    totalLine("Remise", `- ${formatMoney(sale.discount)}`, false, "#B91C1C");
  }
  doc
    .moveTo(totalsX, y + 2)
    .lineTo(pageWidth - margin, y + 2)
    .strokeColor(COLORS.gold)
    .lineWidth(1)
    .stroke();
  y += 8;
  totalLine("TOTAL", formatMoney(sale.total), true, COLORS.primary);

  // ---- Paiement ----
  y += 6;
  doc
    .roundedRect(margin, y, contentWidth, 54, 6)
    .fill(COLORS.light);
  doc
    .fillColor(COLORS.text)
    .font("Helvetica-Bold")
    .fontSize(9)
    .text(
      sale.paymentType === "credit" ? "VENTE À CRÉDIT" : "PAIEMENT COMPTANT",
      margin + 12,
      y + 10
    )
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text(
      `Montant réglé : ${formatMoney(sale.amountPaid)}   •   Reste à payer : ${formatMoney(
        sale.balanceDue
      )}`,
      margin + 12,
      y + 28
    );

  y += 78;

  doc
    .fillColor(COLORS.muted)
    .font("Helvetica-Oblique")
    .fontSize(8)
    .text(
      "Merci de votre confiance. Cette facture est générée automatiquement par SAHAL SHOP.",
      margin,
      y,
      { width: contentWidth, align: "center" }
    )
    .text(
      `${env.shop.name} • ${env.shop.phone} • ${env.shop.email}`,
      margin,
      y + 14,
      { width: contentWidth, align: "center" }
    );

  doc.end();
}
