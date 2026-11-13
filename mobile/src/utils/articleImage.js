import { getApiBaseUrl } from "../api/client";

/**
 * Construit l'URL de l'image d'un article.
 * - `thumb` : miniature légère pour les listes.
 * - `full` : image complète pour la fiche article et le formulaire.
 *
 * Le paramètre `v` force le rafraîchissement du cache natif après un
 * remplacement d'image.
 */
export function articleImageUri(article, size = "thumb") {
  if (!article?._id || !article.hasImage) return "";
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) return "";

  const version = article.imageVersion || article.updatedAt;
  const stamp = version ? new Date(version).getTime() : "";
  const suffix = stamp ? `&v=${stamp}` : "";
  return `${baseUrl}/articles/${article._id}/image?size=${size}${suffix}`;
}
