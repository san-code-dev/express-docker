import { Request, Response } from 'express';
import { ProductService } from './product.service';



const ProductController = {
  async getAll(req: Request, res: Response) {
    try {
      const db = await ProductService.getAll();
      return res.json(db);

    } catch (error) {
      console.error('Error getAll product:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  async getById(req: Request, res: Response) {
    // Implementasi untuk mendapatkan produk berdasarkan ID
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
    // Implementasi untuk membuat produk baru
  },

  async update(req: Request, res: Response) {
    // Implementasi untuk memperbarui produk
  },

  async delete(req: Request, res: Response) {
    // Implementasi untuk menghapus produk
  },
};

export default ProductController;