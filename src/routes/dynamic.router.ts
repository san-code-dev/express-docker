// src/routes/dynamic.router.ts
import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import { handleDynamicRequest } from '../controllers/dynamic.controller';

const router = Router();

export const initDynamicRoutes = (): Router => {
  const ctrl = handleDynamicRequest();

  // Pola URL Baru: /api/:form_key/:action
  // Contoh: /api/penjualan/add-details?header_key=10
  router.all('/:form_key/:action', authMiddleware, ctrl.handleRequest);

  return router;
};