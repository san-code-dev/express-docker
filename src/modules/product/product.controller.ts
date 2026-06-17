import { Request, Response } from 'express';
import { ProductService } from './product.service';
import { parseFilterToPrisma } from '../../utils/prismaFilterParser'; // <-- Import helper baru

const ProductController = {
  async getAll(req: Request, res: Response) {
    try {
      // 1. Tangkap parameter 'where' dari query string url
      const { where } = req.query;
      let rawWhere = {};
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
async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const db = await ProductService.getById(Number(id));
      
      if (!db) {
        return res.status(404).json({ message: 'Product not found' });
      }

      return res.json(db);
    } catch (error) {
      console.error('Error getById product:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const dataUpdate = req.body; 

      if (!dataUpdate || Object.keys(dataUpdate).length === 0) {
        return res.status(400).json({ message: 'No data provided for update' });
      }

      const updatedProduct = await ProductService.update(Number(id), dataUpdate);
      
      return res.json({
        message: 'Product updated successfully',
        data: updatedProduct
      });
    } catch (error: any) {
      console.error('Error update product:', error);
      
      // Mengatasi error record not found dari Prisma (P2025)
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Product not found' });
      }
      
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async delete(req: Request, res: Response) {
    try {
      const { id } = req.params;

      await ProductService.delete(Number(id));

      return res.json({
        message: 'Product deleted successfully'
      });
    } catch (error: any) {
      console.error('Error delete product:', error);
      
      // Mengatasi error record not found dari Prisma (P2025)
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Product not found' });
      }

      return res.status(500).json({ message: 'Internal server error' });
    }
},
}
export default ProductController;