import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

/**
 * On vise un peu moins de 1 Mo pour garder une marge de sécurité avec le
 * base64 (environ +33 %) et la limite de requête du serveur.
 */
const MAX_IMAGE_BYTES = 950 * 1024;

/**
 * Palier de compression : on réduit d'abord la qualité, puis les dimensions.
 * La plupart des photos s'arrêtent au premier ou au deuxième essai.
 */
const ATTEMPTS = [
  { max: 1280, quality: 0.8 },
  { max: 1280, quality: 0.62 },
  { max: 1280, quality: 0.45 },
  { max: 1024, quality: 0.55 },
  { max: 1024, quality: 0.4 },
  { max: 800, quality: 0.5 },
  { max: 800, quality: 0.35 },
  { max: 640, quality: 0.45 },
  { max: 640, quality: 0.3 },
  { max: 480, quality: 0.35 },
  { max: 400, quality: 0.25 },
];

function base64Size(base64) {
  if (!base64) return 0;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

async function renderJpeg(uri, maxSize, quality) {
  // maxWidth/maxHeight décodent l'image en la réduisant dès le départ :
  // on évite de charger une photo 12 Mpx en mémoire pour rien.
  const context = ImageManipulator.manipulate(uri, {
    maxWidth: maxSize,
    maxHeight: maxSize,
  });
  const image = await context.renderAsync();
  return image.saveAsync({
    compress: quality,
    format: SaveFormat.JPEG,
    base64: true,
  });
}

/**
 * Redimensionne et compresse une photo choisie par l'utilisateur.
 * Retourne l'image complète (< 1 Mo) et sa miniature pour les listes.
 */
export async function prepareArticleImage(uri) {
  let sourceUri = uri;
  let result = null;

  for (const attempt of ATTEMPTS) {
    result = await renderJpeg(sourceUri, attempt.max, attempt.quality);
    if (base64Size(result.base64) <= MAX_IMAGE_BYTES) break;
    // Les essais suivants repartent du dernier fichier produit, ce qui évite
    // de redécoder la photo d'origine à chaque baisse de qualité.
    sourceUri = result.uri;
  }

  if (!result?.base64 || base64Size(result.base64) > MAX_IMAGE_BYTES) {
    throw new Error(
      "Impossible de compresser cette image sous 1 Mo. Essayez une autre photo."
    );
  }

  const thumbContext = ImageManipulator.manipulate(result.uri, {
    maxWidth: 240,
    maxHeight: 240,
  });
  const thumbImage = await thumbContext.renderAsync();
  const thumbnail = await thumbImage.saveAsync({
    compress: 0.6,
    format: SaveFormat.JPEG,
    base64: true,
  });

  return {
    uri: result.uri,
    base64: result.base64,
    size: base64Size(result.base64),
    width: result.width,
    height: result.height,
    thumbnailBase64: thumbnail.base64,
    thumbnailSize: base64Size(thumbnail.base64),
    thumbnailWidth: thumbnail.width,
    thumbnailHeight: thumbnail.height,
  };
}

/** Affichage lisible de la taille d'un fichier. */
export function formatFileSize(bytes) {
  const value = Number(bytes) || 0;
  if (value <= 0) return "0 Ko";
  if (value < 1024 * 1024) return `${Math.max(1, Math.round(value / 1024))} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}
