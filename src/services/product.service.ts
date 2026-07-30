// src/services/product.service.ts
import { Product, Prisma } from '@prisma/client';
import { MasterSchema, MasterService } from '../interface/base.interface';
import prisma from '../lib/prisma';
import { parseFilterToPrisma } from '../utils/prismaFilterParser';
import { getSocketInstance } from '../lib/socket';

export const SCHEMA: MasterSchema<Product> = {
  key: 'product',
  label: 'Data Product',
  type: 'master',
  icon: 'iconify:carbon:product',
  permissions: { create: true, edit: true, delete: true },
  isMenuHidden: false,
  schema: [
    { key: 'id', label: 'Product ID', type: 'display', required: true, readonly: true, nullable: false },
    { key: 'name', label: 'Product Name', type: 'text', required: true, size: 300 },
    { key: 'price', label: 'Price', type: 'currency', required: true },
    { key: 'stok', label: 'Stock', type: 'number', required: true },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      size: 120,
      options: [
        { label: 'Aktif', value: 'active' },
        { label: 'Non-Aktif', value: 'inactive' }
      ]
    },
    { key: 'tanggalMasuk', label: 'Tanggal Masuk', type: 'date', size: 160 },
    { key: 'description', label: 'Description', type: 'textarea', size: 200 },
  ],
  data: [] // Diinisialisasi sebagai array kosong sesuai pola standar
};

export const ProductService: MasterService<Product> = {
  getModuleSchema(): MasterSchema<Product> {
    return SCHEMA;
  },

  async getAll(filter?: Record<string, any>): Promise<MasterSchema<Product>> {
    const products = await prisma.product.findMany({
      where: parseFilterToPrisma(filter),
      orderBy: { createdAt: 'asc' }
    });

    SCHEMA.data = products;
    triggerRealtimeEmit();
    return SCHEMA;
  },

  async getById(key: string | number): Promise<Product | null> {
    const product = await prisma.product.findUnique({
      where: { id: Number(key) }
    });
    return product;
  },

  async create(body?: Partial<Product>): Promise<MasterSchema<Product>> {
    await prisma.product.create({
      data: {
        name: body?.name || 'New Product',
        price: body?.price !== undefined ? new Prisma.Decimal(body.price as any) : new Prisma.Decimal(0),
        stok: body?.stok !== undefined ? Number(body.stok) : 0,
        description: body?.description || null,
        status: body?.status || 'active',
        tanggalMasuk: body?.tanggalMasuk ? new Date(body.tanggalMasuk as any) : new Date()
      }
    });

    return await this.getAll();
  },

  async update(key: string | number, body: Partial<Product>): Promise<MasterSchema<Product>> {
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

    await prisma.product.update({
      where: { id },
      data: dataUpdate
    });

    return await this.getAll();
  },

  async delete(key: string | number): Promise<MasterSchema<Product>> {
    const id = Number(key);
    const oldData = await prisma.product.findUnique({ where: { id } });

    if (!oldData) throw new Error('Product tidak ditemukan');

    await prisma.product.delete({ where: { id } });

    return await this.getAll();
  },

  async searchData(keyword: string): Promise<Product[]> {
    console.log('data:', keyword);
    const data = await prisma.product.findMany({
      where: {
        OR: [
          { id: !isNaN(Number(keyword)) ? Number(keyword) : undefined },
          { name: { contains: keyword, mode: 'insensitive' } },
        ].filter(Boolean) as any
      }
    });
    return data;
  }
};

function triggerRealtimeEmit() {
  const io = getSocketInstance();
  if (io) {
    io.emit(`realtime_update:${SCHEMA.key}`, {
      data: {
        data: SCHEMA.data,
      }
    });
  }
}