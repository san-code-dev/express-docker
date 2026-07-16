import { Product, Prisma } from '@prisma/client';
import { MasterSchema, MasterService } from '../interface/base.interface';
import prisma from '../lib/prisma';
import { parseFilterToPrisma } from '../utils/prismaFilterParser';

// 1. Terapkan Generic <Product> langsung dari Prisma ke SCHEMA
export const SCHEMA: MasterSchema<Product> = {
  key: 'product',
  label: 'Data Product',
  type: 'master', 
  icon: 'iconify:carbon:product',
  permissions: { create: true, edit: true, delete: true },
  isMenuHidden: false,
  schema: [
    { key: 'id', label: 'Product ID', type: 'display', required: true, readonly: true, nullable: false },
    { key: 'name', label: 'Product Name', type: 'text', required: true },
    { key: 'price', label: 'Price', type: 'currency', required: true },
    { key: 'stok', label: 'Stock', type: 'number', required: true },
    { key: 'description', label: 'Description', type: 'textarea' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { label: 'Aktif', value: 'active' },
        { label: 'Non-Aktif', value: 'inactive' }
      ]
    },
    { key: 'tanggalMasuk', label: 'Tanggal Masuk', type: 'date' },
  ],
  // Data dibiarkan kosong secara default
};

// 2. Terapkan Generic <Product> pada implementasi Service
export const ProductService: MasterService<Product> = {

  getModuleSchema: function (): MasterSchema<Product> {
    return SCHEMA;
  },

  async getAll(filter?: Record<string, any>): Promise<Product[]> {
    const products = await prisma.product.findMany({
      where: parseFilterToPrisma(filter),
      orderBy: { createdAt: 'asc' }
    });

    return products; // Murni Product[] tanpa mapping ulang
  },

  async getById(key: string | number): Promise<Product | null> {
    return await prisma.product.findUnique({ 
      where: { id: Number(key) } 
    });
  },

  async create(body: Partial<Product>): Promise<Product> {
    const product = await prisma.product.create({
      data: {
        name: body.name || 'New Product',
        // Jika body.price dikirim sebagai angka/string dari UI, cast ke Decimal
        price: body.price ? new Prisma.Decimal(body.price as any) : new Prisma.Decimal(0),
        stok: body.stok ? Number(body.stok) : 0,
        description: body.description || null,
        status: body.status || 'active',
        // Jika body.tanggalMasuk dikirim sebagai string dari UI, cast ke Date
        tanggalMasuk: body.tanggalMasuk ? new Date(body.tanggalMasuk as any) : new Date()
      }
    });

    return product;
  },

  async update(key: string | number, body: Partial<Product>): Promise<Product> {
    const id = Number(key);
    const oldData = await prisma.product.findUnique({ where: { id } });

    if (!oldData) throw new Error('Product tidak ditemukan');

    const dataUpdate: Prisma.ProductUpdateInput = {};
    
    if (body.name !== undefined) dataUpdate.name = body.name;
    if (body.price !== undefined) dataUpdate.price = new Prisma.Decimal(body.price as any);
    if (body.stok !== undefined) dataUpdate.stok = Number(body.stok);
    if (body.description !== undefined) dataUpdate.description = body.description;
    if (body.status !== undefined) dataUpdate.status = body.status;
    if (body.tanggalMasuk !== undefined) dataUpdate.tanggalMasuk = new Date(body.tanggalMasuk as any);

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: dataUpdate
    });

    return updatedProduct;
  },

  async delete(key: string | number): Promise<boolean> {
    const id = Number(key);
    const oldData = await prisma.product.findUnique({ where: { id } });
    
    if (!oldData) throw new Error('Product tidak ditemukan');

    await prisma.product.delete({ where: { id } });
    return true; 
  }
};