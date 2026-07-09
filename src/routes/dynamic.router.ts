// src/routes/dynamic.router.ts
import { Router } from 'express';
import authMiddleware from '../middlewares/auth.middleware';
import { handleDynamicRequest } from '../controllers/dynamic.controller';
import { ModuleRegistry } from '../services/index'; // 🌟 Import registry terpusat

const router = Router();

export const initDynamicRoutes = (): Router => {
  for (const module of ModuleRegistry) {
    const ctrl = handleDynamicRequest(module.service);
    const endpoint = `/${module.name}`; // Menghasilkan: /product dan /penjualan

    // Registrasi HTTP Method secara aman & pasang Auth Middleware
    router.get(endpoint, authMiddleware, ctrl.getAll);
    router.get(`${endpoint}/:id`, authMiddleware, ctrl.getById);
    router.post(endpoint, authMiddleware, ctrl.create);
    router.put(`${endpoint}/:id`, authMiddleware, ctrl.update);
    router.delete(`${endpoint}/:id`, authMiddleware, ctrl.delete);
    
    console.log(`📡 Route Registered: /api${endpoint}`);
  }
  return router;
};