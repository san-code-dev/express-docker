import { Request, Response } from 'express'
import { AuthRequest } from '../middleware/auth.middleware'
import prisma from "../lib/prisma";

const productController = {
  // ==========================================
  // GET ALL (Ambil Data & Skema Metadata-Driven UI)
  // ==========================================
  async getAll(req: AuthRequest, res: Response) {
    try {
      const products = await prisma.product.findMany({
        orderBy: { createdAt: 'desc' }
      });

      const userRole = req.user?.role; // SUPERADMIN, ADMIN, atau USER

      const permissions = {
        view: true, 
        create: userRole === 'SUPERADMIN' || userRole === 'ADMIN',
        edit: userRole === 'SUPERADMIN' || userRole === 'ADMIN',
        delete: userRole === 'SUPERADMIN', 
      };

      const formattedData = products.map(prod => ({
        id: prod.id,
        nmProduct: prod.name, // Mapping 'name' di DB menjadi 'nmProduct' untuk frontend
        price: prod.price,
        description: prod.description || '',
        stock: 0 
      }));

      return res.json({
        key: 'Product',
        label: 'Data product',
        type: 'master',
        permissions,
        schema: [
          { key: 'id', label: 'Product ID', type: 'display', primary: true, readonly: true },
          { key: 'nmProduct', label: 'Product Name', type: 'text' },
          { key: 'price', label: 'Price', type: 'currency' },
          { key: 'description', label: 'Description', type: 'textarea' },
          { key: 'stock', label: 'Stock', type: 'number', autoIncrementOnDuplicate: true },
        ],
        data: formattedData
      });

    } catch (error) {
      console.error('Error getAll product metadata:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // ==========================================
  // GET BY ID
  // ==========================================
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const product = await prisma.product.findUnique({
        where: { id }
      });

      if (!product) {
        return res.status(404).json({ message: 'Product tidak ditemukan' });
      }

      return res.json({
        id: product.id,
        nmProduct: product.name,
        price: product.price,
        description: product.description || '',
        stock: 0
      });
    } catch (error) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // ==========================================
  // CREATE (Tambah Data Baru)
  // ==========================================
// ==========================================
  // CREATE (Tambah Baris Baru Kosong / Placeholder)
  // ==========================================
  async create(req: AuthRequest, res: Response) {
    try {
      // Buat baris baru di PostgreSQL dengan data minimal / placeholder
      const newProduct = await prisma.product.create({
        data: {
          name: "",          // Diisi string kosong dulu karena DB mewajibkan ada string
          description: null, // Boleh null karena di schema prisma Anda ada tanda '?' (description String?)
          price: 0,          // Diisi 0 dulu karena DB mewajibkan Float
        },
      });

      // Transformasikan bentuk datanya agar sesuai dengan format key frontend (nmProduct)
      const formattedNewData = {
        id: newProduct.id,       // ID Otomatis UUID dari Postgres/Prisma
        nmProduct: newProduct.name,
        price: newProduct.price,
        description: newProduct.description || '',
        stock: 0
      };

      // Kembalikan data baru tersebut ke frontend
      return res.status(201).json({
        message: 'Blank product row created successfully',
        data: formattedNewData
      });

    } catch (error: any) {
      console.error('Error creating blank product:', error);
      return res.status(500).json({ 
        message: 'Internal server error', 
        error: error.message 
      });
    }
  },

  // ==========================================
  // UPDATE / AUTO-SAVE (Dipicu dari afterEdit RevoGrid)
  // ==========================================
  async update(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { nmProduct, description, price } = req.body; // Tangkap data dari RevoGrid

      if (!id) {
        return res.status(400).json({ message: 'ID tidak valid' });
      }

      // Jalankan pembaruan data ke PostgreSQL via Prisma
      const updatedProduct = await prisma.product.update({
        where: { id },
        data: {
          // Hanya update jika field-nya dikirim dari frontend
          ...(nmProduct !== undefined && { name: nmProduct }), 
          ...(description !== undefined && { description }),
          ...(price !== undefined && { price: Number(price) }),
        }
      });

      return res.status(200).json({ 
        message: 'Product updated successfully', 
        data: updatedProduct 
      });

    } catch (error: any) {
      console.error('Prisma Update Error:', error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Data tidak ditemukan di database' });
      }
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  },

  // ==========================================
  // REMOVE (Hapus Data)
  // ==========================================
  async remove(req: Request, res: Response) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({ message: 'ID tidak valid atau kosong' });
      }

      const deletedProduct = await prisma.product.delete({
        where: { id },
      });

      return res.status(200).json({
        message: 'Product deleted successfully from database',
        data: deletedProduct
      });

    } catch (error: any) {
      console.error("Prisma Delete Error:", error);
      if (error.code === 'P2025') {
        return res.status(404).json({ message: 'Data sudah tidak ada di database' });
      }
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  },

  // ==========================================
  // QUERY FILTER (🔥 BARU: Untuk melayani Pencarian & Filter dari RevoGrid)
  // ==========================================
  async query(req: Request, res: Response) {
    try {
      const { where } = req.body; // Menangkap payload object { where: prismaWhere } dari frontend
      
      let prismaWhereClause = {};

      // Jika ada filter OR dari pencarian cepat frontend, kita konversi key UI ke DB key
      if (where && where.OR) {
        prismaWhereClause = {
          OR: where.OR.map((condition: any) => {
            // Jika frontend mencari lewat key 'nmProduct', belokkan ke field 'name' database Prisma
            if (condition.nmProduct) {
              return { name: condition.nmProduct };
            }
            return condition;
          })
        };
      } else if (where) {
        prismaWhereClause = where;
      }

      // Ambil data hasil filter dari PostgreSQL
      const filteredProducts = await prisma.product.findMany({
        where: prismaWhereClause,
        orderBy: { createdAt: 'desc' }
      });

      // Format kembali datanya sebelum dilempar ke frontend agar UI tidak pecah
      const formattedData = filteredProducts.map(prod => ({
        id: prod.id,
        nmProduct: prod.name,
        price: prod.price,
        description: prod.description || '',
        stock: 0
      }));

      return res.status(200).json({
        data: formattedData
      });

    } catch (error: any) {
      console.error('Prisma Query Filter Error:', error);
      return res.status(500).json({ message: 'Internal server error', error: error.message });
    }
  }
}

export default productController;