import { Router } from "express";
import builderController from "../../controllers/builder.controller";
import authMiddleware from "../../middleware/auth.middleware";

const router = Router();

router.get("/", authMiddleware, builderController.getSchema);
export default router;
