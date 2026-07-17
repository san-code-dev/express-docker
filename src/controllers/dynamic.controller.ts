// src/controllers/dynamic.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ModuleRegistry } from '../services/index';

const getModuleByKey = (key: string) => {
  return ModuleRegistry.find(m => m.schema.key.toLowerCase() === key.toLowerCase());
};

export const handleDynamicRequest = () => {
  return {
    handleRequest: async (req: Request, res: Response, next: NextFunction): Promise<any> => {
      // Kita asumsikan route pattern-nya: /:service_key/:action/:id?/:detailsId?
      const { service_key, action, id, detailsId } = req.params;
      const httpMethod = req.method.toUpperCase();

      console.log(`\n--- [DYNAMIC ROUTE] ${httpMethod} /${service_key}/${action} ---`);

      const module = getModuleByKey(service_key);
      if (!module) {
        console.error(`🚨 [DYNAMIC ROUTE ERROR]: Service '${service_key}' tidak terdaftar di ModuleRegistry.`);
        return res.status(404).json({ error: `Service untuk '${service_key}' tidak ditemukan.` });
      }

      const { service } = module;
      // get-all -> getAll, update-details -> updateDetails
      const methodName = action.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

      try {
        if (typeof (service as any)[methodName] !== 'function') {
          const errorMessage = `Method '${action}' tidak tersedia pada service '${service_key}'.`;
          return res.status(400).json({ error: errorMessage });
        }

        // =========================================================================
        // NESTED ADAPTER: Menyesuaikan payload request dengan signature method service
        // =========================================================================
        let result: any;
        const targetMethod = (service as any)[methodName].bind(service);

        // Kasus 1: Operasi Detail Transaksi (Butuh 3 parameter: headerId, detailsId, body)
        if (methodName === 'updateDetails') {
          result = await targetMethod(Number(id), Number(detailsId), req.body);
        } 
        // Kasus 2: Operasi Detail Transaksi (Butuh 2 parameter: headerId, id/body)
        else if (methodName === 'addDetails') {
          result = await targetMethod(Number(id), req.body);
        }
        else if (methodName === 'deleteDetails') {
          result = await targetMethod(Number(id), Number(detailsId));
        }
        // Kasus 3: Operasi CRUD Utama Standard yang butuh ID (e.g., update, getById, delete, getHeader)
        else if (['update', 'updateHeader', 'delete', 'getById', 'getHeader', 'getTransaction', 'cancelTransaction', 'saveTransaction'].includes(methodName)) {
          // Cari ID dari params, jika tidak ada baru cek query
          const targetId = Number(id || req.query.id); 
          
          if (['update', 'updateHeader'].includes(methodName)) {
            result = await targetMethod(targetId, req.body);
          } else {
            result = await targetMethod(targetId);
          }
        } 
        // Kasus 4: Ambil list data banyak (getAll butuh filter object)
        else if (methodName === 'getAll') {
          result = await targetMethod(req.query);
        } 
        // Kasus 5: Method tanpa parameter (getModuleSchema, getQueue, newTransaction, getLastTransaction)
        else {
          result = await targetMethod();
        }
        // =========================================================================

        return res.status(httpMethod === 'POST' ? 201 : 200).json(result);

      } catch (err: any) {
        console.error(`\n 🚨 [DYNAMIC ROUTE RUNTIME ERROR] `);
        console.error(`[Route]: ${httpMethod} /${service_key}/${action}`);
        console.error(`[Body]:`,req.body);
        console.error(`[Params]:`,req.params);
        console.error('\x1b[31m%s\x1b[0m',`[Error]: ${err.message}`);

        return res.status(500).json({
          error: `Gagal mengeksekusi aksi '${action}' pada modul '${service_key}'`,
          details: err.message
        });
      }finally{
      console.log(`--- Response: ${res.statusCode} - ${res.statusMessage} ---`);
      }
    }
  };
};