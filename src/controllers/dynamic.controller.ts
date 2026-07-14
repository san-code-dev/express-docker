// src/controllers/dynamic.controller.ts
import { Request, Response, NextFunction } from 'express';
import { ModuleRegistry } from '../services/index';
import { MasterService, TransactionService, MasterSchema, TransactionSchema } from '../interface/base.interface';
import { parseFilterToPrisma } from '../utils/prismaFilterParser';

// Fungsi helper untuk mencari modul berdasarkan key (case-insensitive)
const getModuleByKey = (key: string) => {
  return ModuleRegistry.find(m => m.schema.key.toLowerCase() === key.toLowerCase());
};

// ==========================================
// TYPE GUARDS (Pembeda Tipe yang Aman)
// ==========================================
function isMasterModule(module: { schema: any; service: any }): module is { schema: MasterSchema; service: MasterService } {
  return module.schema.type === 'master';
}

function isTransactionModule(module: { schema: any; service: any }): module is { schema: TransactionSchema; service: TransactionService } {
  return module.schema.type === 'transaction';
}

export const handleDynamicRequest = () => {
  return {
    handleGet: async (req: Request, res: Response, next: NextFunction): Promise<any> => {
      const { form_key, header_key, details_key } = req.params;
      const module = getModuleByKey(form_key);

      if (!module) {
        return res.status(404).json({ error: `Service backend for '${form_key}' not found` });
      }

      try {
        // ==========================================
        // 1. PENANGANAN UNTUK TIPE MASTER
        // ==========================================
        if (isMasterModule(module)) {
          const { service, schema } = module;

          // Jika ada header_key dan service Anda memiliki getById alternatif (seperti di ProductService Anda)
          if (header_key) {
            // Karena getById belum terdaftar di interface dasar MasterService, 
            // kita bisa melakukan check runtime atau memanggil getAll()
            if ('getById' in service && typeof (service as any).getById === 'function') {
              const data = await (service as any).getById(Number(header_key));
              if (!data) return res.status(404).json({ error: `${schema.label} dengan ID ${header_key} tidak ditemukan` });
              return res.json(data);
            }
          }


          // Jika hanya /Product, ambil semua data
          // JIKA REQ /Product -> Ambil filter dari URL Query String (req.query.where)
          let rawWhereFilter = req.query.where;

          // Karena dikirim via JSON.stringify dari frontend, kita perlu parse kembali di sini
          if (typeof rawWhereFilter === 'string') {
            try {
              rawWhereFilter = JSON.parse(rawWhereFilter);
            } catch (e) {
              return res.status(400).json({ error: `Invalid JSON in 'where' query parameter` });
            }
          }

          const prismaWhere = parseFilterToPrisma(rawWhereFilter);
          const result = await service.getAll(prismaWhere);
          return res.json(result);
        }

        // ==========================================
        // 2. PENANGANAN UNTUK TIPE TRANSACTION
        // ==========================================
        if (isTransactionModule(module)) {
          const { service } = module;

          // Pola 3: /penjualan/:header_key/:details_key
          if (form_key && header_key && details_key) {
            const details = await service.getDetails(Number(header_key));
            return res.json(details);
          }

          // Pola 2: /penjualan/:header_key
          if (form_key && header_key && !details_key) {
            const transaction = await service.getTransaction(Number(header_key));
            return res.json(transaction);
          }

          // Pola 1: /penjualan
          if (form_key && !header_key && !details_key) {
              const transaction = await service.getLastTransaction()
              return res.json(transaction);
          }
        }

        return res.status(400).json({ error: `Tipe modul tidak dikenali` });

      } catch (err: any) {
        return res.status(500).json({ error: `Error handling GET request untuk '${form_key}': ${err.message}` });
      }
    },

    handlePost: async (req: Request, res: Response, next: NextFunction): Promise<any> => {
      const { form_key, header_key } = req.params;
      const module = getModuleByKey(form_key);

      if (!module) return res.status(404).json({ error: `Service untuk '${form_key}' tidak ditemukan` });

      try {
        if (isMasterModule(module)) {
          const result = await module.service.create(req.body);
          return res.status(201).json(result);
        }

        if (isTransactionModule(module)) {
          const { service } = module;

          if (!header_key) {
            const result = await service.newTransaction(req.body);
            return res.status(201).json(result);
          }
          const result = await service.addDetails(Number(header_key), req.body);
          return res.status(201).json(result);
        }
      } catch (err: any) {
        return res.status(500).json({ error: `Error handling POST request untuk '${form_key}': ${err.message}` });
      }
    },

    handlePut: async (req: Request, res: Response, next: NextFunction): Promise<any> => {
      const { form_key, header_key, details_key } = req.params;
      const module = getModuleByKey(form_key);

      if (!module) return res.status(404).json({ error: `Service untuk '${form_key}' tidak ditemukan` });

      try {
        if (isMasterModule(module)) {
          if (!header_key) return res.status(400).json({ error: 'ID Master diperlukan untuk update' });
          const result = await module.service.update(Number(header_key), req.body);
          return res.json(result);
        }

        if (isTransactionModule(module)) {
          const { service } = module;

          if (header_key && details_key) {
            const result = await service.updateDetails(Number(header_key), Number(details_key), req.body);
            return res.json(result);
          }
          if (header_key) {
            const result = await service.updateHeader(Number(header_key), req.body);
            return res.json(result);
          }
        }
      } catch (err: any) {
        return res.status(500).json({ error: `Error handling PUT request untuk '${form_key}': ${err.message}` });
      }
    },

    handleDelete: async (req: Request, res: Response, next: NextFunction): Promise<any> => {
      const { form_key, header_key, details_key } = req.params;
      const module = getModuleByKey(form_key);

      if (!module) return res.status(404).json({ error: `Service untuk '${form_key}' tidak ditemukan` });

      try {
        if (isMasterModule(module)) {
          if (!header_key) return res.status(400).json({ error: 'ID Master diperlukan untuk menghapus' });
          const result = await module.service.delete(Number(header_key));
          return res.json({ message: 'Data berhasil dihapus', result });
        }

        if (isTransactionModule(module)) {
          const { service } = module;

          if (header_key && details_key) {
            const result = await service.deleteDetails(Number(header_key), Number(details_key));
            return res.json(result);
          }
          if (header_key) {
            const result = await service.cancelTransaction(Number(header_key), req.body);
            return res.json(result);
          }
        }
      } catch (err: any) {
        return res.status(500).json({ error: `Error handling DELETE request untuk '${form_key}': ${err.message}` });
      }
    },
  };
};