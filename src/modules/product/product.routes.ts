import { Router } from "express";
import ProductController from "./product.controller";
import authMiddleware from "../../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, ProductController.getAll);
router.get("/:id", authMiddleware, ProductController.getById);
router.post("/", authMiddleware, ProductController.create);
router.put("/:id", authMiddleware, ProductController.update);
router.delete("/:id", authMiddleware, ProductController.delete);

export default router;
