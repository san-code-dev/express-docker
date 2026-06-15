import { Request, Response } from 'express';
import { ProductService } from './product.service';
import { parseFilterToPrisma } from '../../utils/prismaFilterParser'; // <-- Import helper baru

const ProductController = {
  async getAll(req: Request, res: Response) {
    try {
      // 1. Tangkap parameter 'where' dari query string url
      const { where } = req.query;
      let rawWhere = {};
      console.log(where)
      // 2. Jika ada data filter, lakukan parsing dari JSON String ke Object/Array awal
      if (where && typeof where === 'string') {
        try {
          rawWhere = JSON.parse(where);
        } catch (parseError) {
          console.error('Error parsing query where:', parseError);
          return res.status(400).json({ message: 'Invalid filter format' });
        }
      }

      // 🔥 KUNCI PERBAIKAN: Bersihkan & konversi data filter menggunakan helper reusable
      const prismaWhere = parseFilterToPrisma(rawWhere);

      // 3. Oper parameter prismaWhere yang SUDAH AMAN ke Service
      const db = await ProductService.getAll(prismaWhere);
      
      return res.json(db);

    } catch (error) {
      console.error('Error getAll product:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getById(req: Request, res: Response) {
    // Implementasi...
  },

  async create(req: Request, res: Response) {
    try {
      const db = await ProductService.create();
      return res.status(201).json({
        message: 'Product created successfully',
        data: db
      });
    } catch (error) {
      console.error('Error create product:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async update(req: Request, res: Response) {
    // Implementasi...
  },

  async delete(req: Request, res: Response) {
    // Implementasi...
  },
};

export default ProductController;