import { Router } from "express";
import userController from "./user.controller";
import authMiddleware from "../../middlewares/auth.middleware";

const router = Router();

router.get("/", authMiddleware, userController.getAll);

router.get("/:id", authMiddleware, userController.getById);

router.post("/", authMiddleware, userController.create);

router.put("/:id", authMiddleware, userController.update);

router.delete("/:id", authMiddleware, userController.remove);

export default router;
