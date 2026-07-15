import { MasterSchema, MasterService } from '../interface/base.interface';
import prisma from '../lib/prisma';
import { parseFilterToPrisma } from '../utils/prismaFilterParser'
import { AuditLogsService } from './audit-logs.service';

export const SCHEMA: MasterSchema = {
  key: 'product',
  label: 'Data Product',
  type: 'master' as const,
  icon: 'iconify:carbon:product',
  permissions: { create: true, edit: true, delete: true },
  isMenuHidden: false,
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



export const ProductService: MasterService = {

  getModuleSchema: function (): MasterSchema {
    return SCHEMA;
  },


  async getAll(params?: any) {

    const products = await prisma.product.findMany({
      where: parseFilterToPrisma(params.filter),
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

    await AuditLogsService.create({
      tableName: 'Product',
      action: 'created',
      oldData: null,
      newData: product
    });

    return product;
  },

  async update(params:any, body: any) {
    const id = Number(params.id);
    const oldData =  await prisma.product.findUnique({ where: { id:id } })

    if (!oldData) throw new Error('Product tidak ditemukan');

    const dataUpdate: any = { ...body };
    if (dataUpdate.price !== undefined) dataUpdate.price = Number(dataUpdate.price);
    if (dataUpdate.stok !== undefined) dataUpdate.stok = Number(dataUpdate.stok);
    if (dataUpdate.tanggalMasuk) dataUpdate.tanggalMasuk = new Date(dataUpdate.tanggalMasuk);

    const updatedProduct = await prisma.product.update({
      where: { id:id },
      data: dataUpdate
    });

    await AuditLogsService.create({
      tableName: 'Product',
      action: 'update',
      oldData,
      newData: updatedProduct
    });

    return updatedProduct;
  },

  async delete(params: any) {
    const id = Number(params.id);
    const oldData =  await prisma.product.findUnique({ where: { id:id } })
    if (!oldData) throw new Error('Product tidak ditemukan');

    const deletedProduct = await prisma.product.delete({ where: { id:id } });

    await AuditLogsService.create({
      tableName: 'Product',
      action: 'delete',
      oldData,
      newData: null
    });

    return deletedProduct;
  }
};