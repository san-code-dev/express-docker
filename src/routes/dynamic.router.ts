// src/routes/dynamic.router.ts
import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import { handleDynamicRequest } from '../controllers/dynamic.controller';

const router = Router();

export const initDynamicRoutes = (): Router => {
  const ctrl = handleDynamicRequest();

  // Pola URL Baru: /api/:service_key/:action
  // Contoh: /api/penjualan/add-details?header_key=10
  router.all('/:service_key/:action', authMiddleware, ctrl.handleRequest);

  return router;
};