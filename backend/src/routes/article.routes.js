import { Router } from "express";
import {
  adjustStock,
  createArticle,
  deleteArticle,
  getArticle,
  getArticleImage,
  listArticles,
  listCategories,
  updateArticle,
} from "../controllers/article.controller.js";
import { protect } from "../middleware/auth.js";

const router = Router();

// Image publique (photo produit) : le cache natif de React Native peut la
// charger directement, sans ajouter d'en-tête d'authentification.
router.get("/:id/image", getArticleImage);

router.use(protect);
router.get("/", listArticles);
router.get("/categories", listCategories);
router.get("/:id", getArticle);
router.post("/", createArticle);
router.put("/:id", updateArticle);
router.post("/:id/stock", adjustStock);
router.delete("/:id", deleteArticle);

export default router;
