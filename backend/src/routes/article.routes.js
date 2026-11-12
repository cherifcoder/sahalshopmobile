import { Router } from "express";
import {
  adjustStock,
  createArticle,
  deleteArticle,
  getArticle,
  listArticles,
  listCategories,
  updateArticle,
} from "../controllers/article.controller.js";
import { protect } from "../middleware/auth.js";

const router = Router();

router.use(protect);
router.get("/", listArticles);
router.get("/categories", listCategories);
router.get("/:id", getArticle);
router.post("/", createArticle);
router.put("/:id", updateArticle);
router.post("/:id/stock", adjustStock);
router.delete("/:id", deleteArticle);

export default router;
