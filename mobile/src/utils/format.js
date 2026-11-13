export const CURRENCY = "UM";

/** Formatage monétaire sans décimales (Ouguiya mauritanienne). */
export function formatMoney(value) {
  const number = Number(value) || 0;
  try {
    return `${number.toLocaleString("fr-FR", { maximumFractionDigits: 0 })} ${CURRENCY}`;
  } catch {
    return `${Math.round(number)} ${CURRENCY}`;
  }
}

/** Version courte (sans devise) pour les axes / badges. */
export function formatNumber(value) {
  try {
    return Number(value || 0).toLocaleString("fr-FR", { maximumFractionDigits: 0 });
  } catch {
    return String(Math.round(Number(value) || 0));
  }
}

export function toDate(value) {
  return value ? new Date(value) : new Date();
}

export function formatDate(value, withTime = false) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const options = { day: "2-digit", month: "short", year: "numeric" };
  if (withTime) {
    options.hour = "2-digit";
    options.minute = "2-digit";
    return date.toLocaleString("fr-FR", options);
  }
  return date.toLocaleDateString("fr-FR", options);
}

export function formatTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Date locale au format AAAA-MM-JJ (sans décalage UTC). */
export function toISODate(date = new Date()) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayISO() {
  return toISODate(new Date());
}

/** Bornes envoyées à l'API pour les filtres prédéfinis. */
export function presetRange(preset, now = new Date()) {
  const end = toISODate(now);
  if (preset === "today") return { startDate: end, endDate: end };

  if (preset === "week") {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    return { startDate: toISODate(d), endDate: end };
  }

  if (preset === "month") {
    return {
      startDate: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
      endDate: end,
    };
  }

  return {
    startDate: toISODate(new Date(now.getFullYear(), 0, 1)),
    endDate: end,
  };
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export const PAYMENT_LABELS = {
  cash: "Espèces",
  credit: "Crédit",
  mobile_money: "Mobile Money",
  bank: "Banque",
  other: "Autre",
};

export const LOSS_LABELS = {
  damage: "Casse",
  theft: "Vol",
  expiry: "Péremption",
  other: "Autre",
};

export const EXPENSE_ICONS = {
  fuel: "car-outline",
  salary: "people-outline",
  delivery: "bicycle-outline",
  rent: "home-outline",
  utilities: "flash-outline",
  supplies: "cube-outline",
  maintenance: "construct-outline",
  tax: "document-text-outline",
  other: "ellipsis-horizontal-circle-outline",
};

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
