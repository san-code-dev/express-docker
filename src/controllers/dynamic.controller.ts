// src/controllers/dynamic.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ModuleRegistry } from '../services/index';
import { getSocketInstance } from '../lib/socket'; // <--- Import helper socket

const getModuleByKey = (key: string) => {
  return ModuleRegistry.find(m => m.schema.key.toLowerCase() === key.toLowerCase());
};

export const handleDynamicRequest = () => {
  return {
    handleRequest: async (req: Request, res: Response, next: NextFunction): Promise<any> => {
      const { service_key, action } = req.params;
      const httpMethod = req.method.toUpperCase();

      console.log(`\n--- [DYNAMIC ROUTE] ${httpMethod} /${service_key}/${action} ---`);

      const module = getModuleByKey(service_key);
      if (!module) {
        console.error(`🚨 [DYNAMIC ROUTE ERROR]: Service '${service_key}' tidak terdaftar di ModuleRegistry.`);
        return res.status(404).json({ error: `Service untuk '${service_key}' tidak ditemukan.` });
      }

      const { service } = module;
      // Konversi kebab-case ke camelCase (contoh: add-details -> addDetails)
      const methodName = action.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

      try {
        if (typeof (service as any)[methodName] !== 'function') {
          const errorMessage = `Method '${action}' tidak tersedia pada service '${service_key}'.`;
          return res.status(400).json({ error: errorMessage });
        }

        const targetMethod = (service as any)[methodName].bind(service);

        // =========================================================================
        // ACTION HANDLERS MAP (STRATEGY PATTERN)
        // =========================================================================
        const actionHandlers: Record<string, () => Promise<any>> = {
          // --- DETAIL OPERATIONS ---
          'update-details': async () => {
            const { id, headerId, ...payload } = req.body;
            return await targetMethod(Number(headerId), Number(id), payload);
          },
          'add-details': async () => {
            const { headerId, ...payload } = req.body;
            return await targetMethod(Number(headerId), payload);
          },
          'delete-details': async () => {
            const { headerId, id } = req.query;
            return await targetMethod(Number(headerId), Number(id));
          },

          // --- HEADER & CRUD OPERATIONS WITH ID + BODY ---
          'update': async () => {
            const { id, ...payload } = req.body;
            return await targetMethod(Number(id || req.query.id), payload);
          },
          'update-header': async () => {
            const { id, ...payload } = req.body;
            return await targetMethod(Number(id || req.query.id), payload);
          },

          // --- CRUD OPERATIONS WITH ID ONLY ---
          'get-by-id': async () => await targetMethod(Number(req.query.id || req.body?.id)),
          'get-header': async () => await targetMethod(Number(req.query.id || req.body?.id)),
          'get-transaction': async () => await targetMethod(Number(req.query.id || req.body?.id)),
          'delete': async () => await targetMethod(Number(req.query.id || req.body?.id)),
          'cancel-transaction': async () => await targetMethod(Number(req.query.id || req.body?.id)),

          // --- GET ALL (FILTER VIA QUERY) ---
          'get-all': async () => await targetMethod(req.query),
          'search-data': async () => await targetMethod(req.query.keyword),
        };

        // Execution: Jika action terdaftar di handler gunakan itu, jika tidak ada (fallback) eksekusi tanpa argumen
        const executeAction = actionHandlers[action] || (async () => await targetMethod());
        const result = await executeAction();

        // =========================================================================
        // BROADCAST REAL-TIME OTOMATIS (Menggunakan getSocketInstance)
        // =========================================================================
        const io = getSocketInstance();
        if (httpMethod !== 'GET' && io) {
          io.emit(`realtime_update:${service_key}`, {
            action,
            service: service_key,
            data: result
          });
        }
        // =========================================================================

        return res.status(httpMethod === 'POST' ? 201 : 200).json(result);

      } catch (err: any) {
        console.error(`\n 🚨 [DYNAMIC ROUTE RUNTIME ERROR] `);
        console.error(`[Route]: ${httpMethod} /${service_key}/${action}`);
        console.error(`[Body]:`, req.body);
        console.error(`[Query]:`, req.query);
        console.error('\x1b[31m%s\x1b[0m', `[Error]: ${err.message}`);

        return res.status(500).json({
          error: `Gagal mengeksekusi aksi '${action}' pada modul '${service_key}'`,
          details: err.message
        });
      } finally {
        console.log(`--- Response: ${res.statusCode} - ${res.statusMessage} ---`);
      }
    }
  };
};