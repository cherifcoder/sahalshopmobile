import { ArticleImage } from "../models/ArticleImage.js";
import { ApiError } from "../utils/ApiError.js";

/** L'image complète ne doit jamais dépasser 1 Mo. */
export const MAX_IMAGE_BYTES = 1024 * 1024;
/** La miniature utilisée dans les listes doit rester très légère. */
export const MAX_THUMBNAIL_BYTES = 200 * 1024;

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function detectImageMime(buffer) {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function decodeBase64Image(value, declaredMime, maxBytes, label) {
  if (typeof value !== "string" || !value.trim()) {
    throw new ApiError(400, `${label} est vide ou invalide.`);
  }

  let base64 = value.trim();
  let mime = declaredMime;
  const dataUri = base64.match(/^data:([^;,]+);base64,(.+)$/s);
  if (dataUri) {
    mime = mime || dataUri[1];
    base64 = dataUri[2];
  }

  if (mime && !ALLOWED_MIME_TYPES.has(mime)) {
    throw new ApiError(400, `${label} doit être au format JPEG, PNG ou WebP.`);
  }

  const buffer = Buffer.from(base64, "base64");
  if (!buffer.length) {
    throw new ApiError(400, `${label} est vide ou invalide.`);
  }
  if (buffer.length > maxBytes) {
    const limitMb = Math.round((maxBytes / (1024 * 1024)) * 100) / 100;
    throw new ApiError(400, `${label} doit faire moins de ${limitMb} Mo.`);
  }

  const detected = detectImageMime(buffer);
  if (!detected) {
    throw new ApiError(400, `${label} n'est pas une image valide.`);
  }

  return { buffer, mimeType: detected, size: buffer.length };
}

function dimension(value, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return fallback;
  return Math.min(Math.round(number), 20000);
}

/**
 * Valide le payload envoyé par le mobile et prépare les buffers à enregistrer.
 * Le mobile compresse l'image avant l'envoi, mais le serveur applique aussi
 * la limite de 1 Mo pour ne jamais stocker un fichier trop lourd.
 */
export function normalizeArticleImagePayload(image) {
  if (!image || typeof image !== "object") {
    throw new ApiError(400, "Image invalide.");
  }

  const full = decodeBase64Image(
    image.data,
    image.mimeType,
    MAX_IMAGE_BYTES,
    "L'image"
  );

  if (!image.thumbnailData) {
    throw new ApiError(400, "La miniature de l'image est requise.");
  }
  const thumbnail = decodeBase64Image(
    image.thumbnailData,
    image.thumbnailMimeType,
    MAX_THUMBNAIL_BYTES,
    "La miniature"
  );

  return {
    data: full.buffer,
    contentType: full.mimeType,
    size: full.size,
    thumbnail: thumbnail.buffer,
    thumbnailContentType: thumbnail.mimeType,
    thumbnailSize: thumbnail.size,
    width: dimension(image.width),
    height: dimension(image.height),
    thumbnailWidth: dimension(image.thumbnailWidth),
    thumbnailHeight: dimension(image.thumbnailHeight),
  };
}

export async function saveArticleImage(articleId, payload, options = {}) {
  return ArticleImage.findOneAndUpdate(
    { article: articleId },
    {
      $set: {
        data: payload.data,
        contentType: payload.contentType,
        size: payload.size,
        thumbnail: payload.thumbnail,
        thumbnailContentType: payload.thumbnailContentType,
        thumbnailSize: payload.thumbnailSize,
        width: payload.width,
        height: payload.height,
        thumbnailWidth: payload.thumbnailWidth,
        thumbnailHeight: payload.thumbnailHeight,
      },
      $setOnInsert: { article: articleId },
    },
    { upsert: true, new: true, ...options }
  );
}

export async function deleteArticleImage(articleId, options = {}) {
  return ArticleImage.deleteOne({ article: articleId }, options);
}
