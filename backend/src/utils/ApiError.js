/** Erreur métier avec code HTTP. */
export class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

/** Wrapper pour les contrôleurs async (utile même avec Express 5). */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Arrondi monétaire (2 décimales). */
export const money = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/** Convertit une valeur en nombre positif ou lève une erreur 400. */
export const toPositiveNumber = (value, field, { allowZero = false } = {}) => {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (!allowZero && number === 0)) {
    throw new ApiError(400, `${field} doit être un nombre ${allowZero ? "positif ou nul" : "strictement positif"}.`);
  }
  return number;
};

/** Échappe les caractères spéciaux d'une expression régulière. */
export const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
