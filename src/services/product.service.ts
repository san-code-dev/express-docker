import prisma from '../lib/prisma';
import { createAuditLog } from '../utils/audit';

export const SCHEMA = {
  key: 'Product',
  label: 'Data Product',
  type: 'master' as const,
  icon: 'iconify:carbon:product',
  permissions: { create: true, edit: true, delete: true },
  schema: [
    { key: 'id', label: 'Product ID', type: 'display', primary: true, readonly: true },
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
  data: [] as any[],
};

export const ProductService = {
  async getAll(where: any = {}) {
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'asc' }
    });

    // Mapping data agar ramah dengan komponen frontend Vue Anda
    SCHEMA.data = products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price), // Konversi Decimal ke Number untuk JavaScript/Vue
      stok: p.stok,
      description: p.description,
      status: p.status,
      tanggalMasuk: p.tanggalMasuk.toISOString().split('T')[0]
    }));

    return SCHEMA;
  },

  async getById(id: number) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return null;

    return {
      ...product,
      price: Number(product.price),
      tanggalMasuk: product.tanggalMasuk.toISOString().split('T')[0]
    };
  },

  async create(body: any) {
    const product = await prisma.product.create({
      data: {
        name: body.name || 'New Product',
        price: body.price ? Number(body.price) : 0,
        stok: body.stok ? Number(body.stok) : 0,
        description: body.description,
        status: body.status || 'active',
        tanggalMasuk: body.tanggalMasuk ? new Date(body.tanggalMasuk) : new Date()
      }
    });

    await createAuditLog({
      tableName: 'Product',
      action: 'created',
      oldData: null,
      newData: product
    });

    return product;
  },

  async update(id: number, body: any) {
    const oldData = await this.getById(id);
    if (!oldData) throw new Error('Product tidak ditemukan');

    const dataUpdate: any = { ...body };
    if (dataUpdate.price !== undefined) dataUpdate.price = Number(dataUpdate.price);
    if (dataUpdate.stok !== undefined) dataUpdate.stok = Number(dataUpdate.stok);
    if (dataUpdate.tanggalMasuk) dataUpdate.tanggalMasuk = new Date(dataUpdate.tanggalMasuk);

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: dataUpdate
    });

    await createAuditLog({
      tableName: 'Product',
      action: 'update',
      oldData,
      newData: updatedProduct
    });

    return updatedProduct;
  },

  async delete(id: number) {
    const oldData = await this.getById(id);
    if (!oldData) throw new Error('Product tidak ditemukan');

    const deletedProduct = await prisma.product.delete({ where: { id } });

    await createAuditLog({
      tableName: 'Product',
      action: 'delete',
      oldData,
      newData: null
    });

    return deletedProduct;
  }
};