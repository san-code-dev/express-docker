// src/controllers/dynamic.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ModuleRegistry } from '../services/index';

// Helper untuk mencari modul berdasarkan key (case-insensitive)
const getModuleByKey = (key: string) => {
  return ModuleRegistry.find(m => m.schema.key.toLowerCase() === key.toLowerCase());
};

// Helper untuk mengubah string/number query params menjadi tipe data asli
const parseArgs = (query: Record<string, any>): any[] => {
  return Object.values(query).map(val => (isNaN(Number(val)) ? val : Number(val)));
};

export const handleDynamicRequest = () => {
  return {
    handleRequest: async (req: Request, res: Response, next: NextFunction): Promise<any> => {
      const { form_key, action } = req.params;
      const httpMethod = req.method.toUpperCase();

      // 1. Log request yang masuk untuk mempermudah debugging
      console.log(`\n--- [DYNAMIC ROUTE] ${httpMethod} /${form_key}/${action} ---`);

      const module = getModuleByKey(form_key);
      if (!module) {
        return res.status(404).json({ error: `Service untuk '${form_key}' tidak ditemukan.` });
      }

      const { service } = module;
      // Mengubah format kebab-case (get-details) menjadi camelCase (getDetails)
      const methodName = action.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

      // 2. Validasi apakah method tersebut ada di service terkait
      if (typeof (service as any)[methodName] !== 'function') {
        return res.status(400).json({ 
          error: `Method '${action}' (${methodName}) tidak tersedia pada service '${form_key}'.` 
        });
      }

      try {
        const isPayloadMethod = ['POST', 'PUT'].includes(httpMethod);

        // 3. Eksekusi satu baris ajaib menggunakan conditional array spreading
        const result = await (service as any)[methodName](
          ...parseArgs(req.query),
          ...(isPayloadMethod ? [req.body] : [])
        );

        return res.status(httpMethod === 'POST' ? 201 : 200).json(result);

      } catch (err: any) {
        // 4. Detail error tracker yang sangat lengkap di console terminal Anda
        console.error(`\n=== 🚨 [DYNAMIC ROUTE ERROR] 🚨 ===`);
        console.error(`[Route]: ${httpMethod} /${form_key}/${action}`);
        console.error(`[Payload]:`, JSON.stringify(req.body));
        console.error(`[Error]: ${err.message}`);
        console.error(`[Stack]:`, err.stack);
        console.error(`====================================\n`);

        return res.status(500).json({ 
          error: `Gagal mengeksekusi aksi '${action}' pada modul '${form_key}'`,
          details: err.message 
        });
      }
    }
  };
};