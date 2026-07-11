// src/routes/dynamic.router.ts
import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import { handleDynamicRequest } from '../controllers/dynamic.controller';

const router = Router();

export const initDynamicRoutes = (): Router => {
  const ctrl = handleDynamicRequest();

  // Pola URL dinamis berjenjang
  const baseRoute = '/:form_key';
  const headerRoute = '/:form_key/:header_key';
  const detailsRoute = '/:form_key/:header_key/:details_key';

  const routePatterns = [detailsRoute, headerRoute, baseRoute];

  router.get(routePatterns, authMiddleware, ctrl.handleGet);
  router.post(routePatterns, authMiddleware, ctrl.handlePost);
  router.put(routePatterns, authMiddleware, ctrl.handlePut);
  router.delete(routePatterns, authMiddleware, ctrl.handleDelete);

  return router;
};