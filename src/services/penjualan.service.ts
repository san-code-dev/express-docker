// src/services/penjualan.service.ts
import { Prisma, Penjualan, PenjualanDetail, Customer } from '@prisma/client';
import prisma from '../lib/prisma';
import { userContextStorage } from '../utils/context';
import { TransactionSchema, TransactionService } from '../interface/base.interface';
import { generateNewInvoiceNumber } from '../utils/erpUtils';

const _LOGED_USER = {
  name: userContextStorage.getStore()?.email || 'System/Unknown',
  permissions: {
    penjualan: { view: true, create: true, edit: false, delete: false }
  }
};

// Menggunakan tipe inline { id: number; label: string } langsung pada parameter Generic ketiga
export const SCHEMA: TransactionSchema<Penjualan, PenjualanDetail, { id: number; label: string }> = {
  key: 'penjualan',
  prefix: 'PJ',
  label: 'Transaksi Penjualan (POS)',
  type: 'transaction',
  icon: 'iconify:mdi-cash-register',
  permissions: _LOGED_USER.permissions['penjualan'],
  isMenuHidden: false,
  actions: [
    { key: 'print', label: 'Cetak Nota', type: 'printer' },
    { key: 'pay', label: 'Bayar Langsung', type: 'payment' },
  ],
  queue: {
    label: 'ANTRIAN TRANSAKSI',
    schema: [
      { key: 'id', label: 'ID Order', type: 'display', primary: true, readonly: true, nullable: false },
      { key: 'label', label: 'Pelanggan', type: 'text' }, // Sesuai request: key diubah menjadi 'label'
    ],
    data: []
  },
  header: {
    label: 'INFORMASI UTAMA NOTA',
    schema: [
      { key: 'id', label: 'ID', type: 'display', primary: true, readonly: true, nullable: false },
      { key: 'noInvoice', label: 'No Invoice', type: 'text', readonly: true },
      { key: 'date', label: 'Tanggal Transaksi', type: 'date' },
      {
        key: 'customerId', label: 'Customer', type: 'relation', relation: {
          entity: 'customer', valueField: 'id', displayField: 'nmCustomer', api: '/api/customer',
        }, validation: { required: true }
      },
      { key: 'discount', label: 'Potongan Diskon', type: 'currency' },
      { key: 'total', label: 'Total Bayar', type: 'currency', readonly: true, highlight: true },
    ],
    data: null
  },
  details: {
    label: 'DAFTAR BARANG BELANJA',
    schema: [
      { key: 'name', label: 'Nama', type: 'display', primary: true, readonly: true, nullable: false },
      {
        key: 'productId', label: 'Pilih Produk', type: 'relation', relation: {
          entity: 'product', valueField: 'id', displayField: 'name', api: '/api/product',
        }, validation: { required: true }
      },
      { key: 'quantity', label: 'Qty', type: 'number', validation: { required: true, min: 1 } },
      { key: 'price', label: 'Harga Satuan', type: 'currency', readonly: true },
      { key: 'subtotal', label: 'Subtotal', readonly: true, type: 'computed', formula: '{quantity} * {price}' }
    ],
    data: []
  }
};

// PenjualanService disesuaikan dengan generic yang sama agar tidak error
export const PenjualanService: TransactionService<Penjualan, PenjualanDetail, { id: number; label: string }> = {
  
  getModuleSchema(): TransactionSchema<Penjualan, PenjualanDetail, { id: number; label: string }> {
    return SCHEMA;
  },

  async getQueue(): Promise<Array<{ id: number; label: string }>> {
    const activeTransactions = await prisma.penjualan.findMany({
      include: { customer: true },
      orderBy: { id: 'desc' }
    });

    // Mapping murni tanpa interface kustom
    return activeTransactions.map(t => ({
      id: t.id,
      label: (t.customer as Customer | null)?.nmCustomer || ''
    }));
  },

  async getHeader(id: number): Promise<Penjualan | null> {
    return await prisma.penjualan.findUnique({ where: { id } });
  },

  async getDetails(headerId: number): Promise<PenjualanDetail[]> {
    return await prisma.penjualanDetail.findMany({ where: { penjualanId: headerId } });
  },

  async getLastTransaction(): Promise<Penjualan | null> {
    const queue = await this.getQueue();
    if (queue && queue.length > 0) {
      return await prisma.penjualan.findUnique({ where: { id: queue[0].id } });
    } 
    return await this.newTransaction();
  },

  async newTransaction(): Promise<Penjualan> {
    return await prisma.penjualan.create({
      data: {
        noInvoice: `DRAFT-${Date.now()}`,
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0),
        createdBy: _LOGED_USER.name,
      },
    });
  },

  async getTransaction(id: number): Promise<{ header: Penjualan; details: any[] } | null> {
    const transaction = await prisma.penjualan.findUnique({
      where: { id },
      include: {
        customer: true,
        details: { include: { product: true } }
      }
    });

    if (!transaction) return null;

    return {
      header: transaction,
      details: transaction.details
    };
  },

  async updateHeader(id: number, body: Partial<Penjualan>): Promise<Penjualan> {
    const updated = await prisma.penjualan.update({
      where: { id },
      data: {
        customerId: body.customerId ? Number(body.customerId) : null,
        discount: body.discount !== undefined ? new Prisma.Decimal(body.discount as any) : undefined,
      }
    });

    await syncInvoiceTotal(id);
    return updated;
  },

  async addDetails(headerId: number, body: { query: string | number }): Promise<PenjualanDetail> {
    const product = await prisma.product.findFirst({
      where: { id: Number(body.query) }
    });

    if (!product) throw new Error('Produk tidak ditemukan');

    const newDetail = await prisma.penjualanDetail.create({
      data: {
        quantity: 1,
        price: product.price,
        product: { connect: { id: product.id } },
        penjualan: { connect: { id: headerId } }
      }
    });

    await syncInvoiceTotal(headerId);
    return newDetail;
  },

  async updateDetails(headerId: number, id: number, body: Partial<PenjualanDetail>): Promise<PenjualanDetail> {
    const dataUpdate: Prisma.PenjualanDetailUpdateInput = {};
    if (body.quantity !== undefined) dataUpdate.quantity = Number(body.quantity);
    if (body.price !== undefined) dataUpdate.price = new Prisma.Decimal(body.price as any);

    const updatedDetail = await prisma.penjualanDetail.update({
      where: { id },
      data: dataUpdate,
    });

    await syncInvoiceTotal(headerId);
    return updatedDetail;
  },

  async deleteDetails(headerId: number, id: number): Promise<boolean> {
    await prisma.penjualanDetail.delete({ where: { id } });
    await syncInvoiceTotal(headerId);
    return true;
  },

  async cancelTransaction(id: number): Promise<boolean> {
    await prisma.penjualan.delete({ where: { id } });
    return true;
  },

  async saveTransaction(id: number): Promise<Penjualan> {
    const finalInvoiceNo = await generateNewInvoiceNumber(SCHEMA);

    return await prisma.penjualan.update({
      where: { id },
      data: { noInvoice: finalInvoiceNo }
    });
  }
};

async function syncInvoiceTotal(penjualanId: number): Promise<void> {
  const tx = await prisma.penjualan.findUnique({
    where: { id: penjualanId },
    include: { details: true }
  });

  if (!tx) return;

  const grossTotal = tx.details.reduce((sum, item) => {
    return sum + (item.quantity * Number(item.price));
  }, 0);

  const netTotal = Math.max(0, grossTotal - Number(tx.discount));

  await prisma.penjualan.update({
    where: { id: penjualanId },
    data: { total: new Prisma.Decimal(netTotal) }
  });
}