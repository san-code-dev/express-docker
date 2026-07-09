// src/controllers/dynamic.controller.ts
import { Request, Response, NextFunction } from 'express';
import { parseFilterToPrisma } from '../utils/prismaFilterParser';

export const handleDynamicRequest = (service: any) => {
  return {
    async getAll(req: Request, res: Response, next: NextFunction) {
      try {
        const { where } = req.query;
        let rawWhere = {};
        if (where && typeof where === 'string') {
          try { rawWhere = JSON.parse(where); } 
          catch { return res.status(400).json({ message: 'Invalid filter format' }); }
        }
        
        const prismaWhere = parseFilterToPrisma(rawWhere);
        const result = await service.getAll(prismaWhere);
        return res.json(result);
      } catch (error) { next(error); }
    },

    async getById(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        const data = await service.getById(Number(id));
        if (!data) return res.status(404).json({ message: 'Data tidak ditemukan' });
        return res.json(data);
      } catch (error) { next(error); }
    },

    async create(req: Request, res: Response, next: NextFunction) {
      try {
        const result = await service.create(req.body);
        return res.status(201).json({ message: 'Data berhasil dibuat', data: result });
      } catch (error) { next(error); }
    },

    async update(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        if (!req.body || Object.keys(req.body).length === 0) {
          return res.status(400).json({ message: 'Tidak ada data untuk diubah' });
        }
        const result = await service.update(Number(id), req.body);
        return res.json({ message: 'Data berhasil diubah', data: result });
      } catch (error: any) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'Data tidak ditemukan' });
        next(error);
      }
    },

    async delete(req: Request, res: Response, next: NextFunction) {
      try {
        const { id } = req.params;
        await service.delete(Number(id));
        return res.json({ message: 'Data berhasil dihapus' });
      } catch (error: any) {
        if (error.code === 'P2025') return res.status(404).json({ message: 'Data tidak ditemukan' });
        next(error);
      }
    }
  };
};