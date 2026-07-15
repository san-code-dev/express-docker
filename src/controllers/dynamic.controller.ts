// src/controllers/dynamic.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ModuleRegistry } from '../services/index';

const getModuleByKey = (key: string) => {
  return ModuleRegistry.find(m => m.schema.key.toLowerCase() === key.toLowerCase());
};

export const handleDynamicRequest = () => {
  return {
    handleRequest: async (req: Request, res: Response, next: NextFunction): Promise<any> => {
      const { service_key, action } = req.params;
      const httpMethod = req.method.toUpperCase();

      // 1. Log request yang masuk untuk mempermudah debugging awal
      console.log(`\n--- [DYNAMIC ROUTE] ${httpMethod} /${service_key}/${action} ---`);

      const module = getModuleByKey(service_key);
      if (!module) {
        console.error(`🚨 [DYNAMIC ROUTE ERROR]: Service '${service_key}' tidak terdaftar di ModuleRegistry.`);
        return res.status(404).json({ error: `Service untuk '${service_key}' tidak ditemukan.` });
      }

      const { service } = module;
      // Mengubah format kebab-case (get-all-logs) menjadi camelCase (getAllLogs)
      const methodName = action.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

      try {
        if (typeof (service as any)[methodName] !== 'function') {
          const errorMessage = `Method '${action}' tidak tersedia pada service '${service_key}'.`;
          return res.status(400).json({ error: errorMessage });
        }

        const  result = await (service as any)[methodName](req.query, req.body);
       
        return res.status(httpMethod === 'POST' ? 201 : 200).json(result);

      } catch (err: any) {
        // 4. Detail error tracker jika terjadi error runtime di dalam service (database, syntax, dll)
        console.error(`\n============== 🚨 [DYNAMIC ROUTE RUNTIME ERROR] 🚨 ==============`);
        console.error(`[Url]:`, JSON.stringify(req.url));
        console.error(`[Route]: ${httpMethod} /${service_key}/${action}`);
        console.error(`[Body]:`, JSON.stringify(req.body));
        console.error(`[Query]:`, JSON.stringify(req.query));
        console.error(`[Params]:`, JSON.stringify(req.params));
        console.error(`[Error]: ${err.message}`);
        console.error(`[Stack]:`, err.stack);
        console.error(`====================================\n`);

        return res.status(500).json({
          error: `Gagal mengeksekusi aksi '${action}' pada modul '${service_key}'`,
          details: err.message
        });
      }
    }
  };
};