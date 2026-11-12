import { ApiError } from "./ApiError.js";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Retourne le début de journée (heure locale du serveur). */
export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Retourne la fin de journée (heure locale du serveur). */
export function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Lundi comme premier jour de la semaine. */
export function startOfWeek(date = new Date()) {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d;
}

export function startOfMonth(date = new Date()) {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function startOfYear(date = new Date()) {
  const d = startOfMonth(date);
  d.setMonth(0);
  return d;
}

/**
 * Analyse une date de filtre.
 * - "2026-11-12" => début ou fin de journée selon `end`
 * - ISO complet => date exacte
 */
export function parseDate(value, field, end = false) {
  if (!value) throw new ApiError(400, `Le paramètre ${field} est requis.`);
  const date = DATE_ONLY.test(value)
    ? new Date(`${value}T00:00:00`)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new ApiError(400, `Format de date invalide pour ${field}. Utilisez AAAA-MM-JJ.`);
  }

  return DATE_ONLY.test(value) && end ? endOfDay(date) : date;
}

/** Construit la plage demandée avec des valeurs par défaut (mois courant). */
export function resolveRange(query) {
  const now = new Date();
  const start = query.startDate
    ? parseDate(query.startDate, "startDate")
    : startOfMonth(now);
  const end = query.endDate
    ? parseDate(query.endDate, "endDate", true)
    : endOfDay(now);

  if (start > end) {
    throw new ApiError(400, "La date de début doit précéder la date de fin.");
  }

  return { start, end };
}

/** Renvoie les bornes prêtes pour le dashboard. */
export function presetRanges(now = new Date()) {
  return {
    today: { start: startOfDay(now), end: endOfDay(now) },
    week: { start: startOfWeek(now), end: endOfDay(now) },
    month: { start: startOfMonth(now), end: endOfDay(now) },
    year: { start: startOfYear(now), end: endOfDay(now) },
  };
}
