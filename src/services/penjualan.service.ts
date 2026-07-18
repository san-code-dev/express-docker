// src/services/penjualan.service.ts
import { Prisma, Penjualan, PenjualanDetail, Customer } from '@prisma/client';
import prisma from '../lib/prisma';
import { userContextStorage } from '../utils/context';
import { TransactionSchema, TransactionService } from '../interface/base.interface';
import { generateNewInvoiceNumber } from '../utils/erpUtils';

// Helper fungsi agar evaluasi context user bersifat dinamis per request
function getLoggedUser() {
  return {
    name: userContextStorage.getStore()?.email || 'System/Unknown',
    permissions: {
      penjualan: { view: true, create: true, edit: false, delete: false }
    }
  };
}

export const SCHEMA: TransactionSchema<Penjualan, PenjualanDetail, { id: number; label: string }> = {
  key: 'penjualan',
  prefix: 'PJ',
  label: 'Transaksi Penjualan (POS)',
  type: 'transaction',
  icon: 'iconify:mdi-cash-register',
  permissions: { view: true, create: true, edit: false, delete: false }, // Harusnya dinamis atau via middleware, sementara di-hardcode aman untuk schema static
  isMenuHidden: false,
  actions: [
    { key: 'print', label: 'Cetak Nota', type: 'printer' },
    { key: 'pay', label: 'Bayar Langsung', type: 'payment' },
  ],
  queue: {
    label: 'ANTRIAN TRANSAKSI',
    schema: [
      { key: 'id', label: 'ID Order', type: 'display', primary: true, readonly: true, nullable: false },
      { key: 'label', label: 'Pelanggan', type: 'text' },
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
      { key: 'name', label: 'Nama', type: 'display', primary: true, readonly: true, nullable: false, size:250  },
      {
        key: 'productId', label: 'Pilih Produk', type: 'relation', relation: {
          entity: 'product', valueField: 'id', displayField: 'name', api: '/api/product',
        }, validation: { required: true }, size:250
      },
      { key: 'quantity', label: 'Qty', type: 'number', validation: { required: true, min: 1 }, size:80 },
      { key: 'price', label: 'Harga Satuan', type: 'currency', readonly: true, size:150 },
      { key: 'subtotal', label: 'Subtotal', readonly: true, type: 'computed', formula: '{quantity} * {price}', size:250 }
    ],
    data: []
  }
};

export const PenjualanService: TransactionService<Penjualan, PenjualanDetail, { id: number; label: string }> = {
  
  getModuleSchema() {
    return SCHEMA;
  },

  async getQueue() {
    const activeTransactions = await prisma.penjualan.findMany({
      include: { customer: true },
    });

    return activeTransactions.map(t => ({
      id: t.id,
      label: (t.customer as Customer | null)?.nmCustomer || 'Pelanggan Umum'
    }));
  },

  async getHeader(id: number) {
    return await prisma.penjualan.findUnique({ where: { id } });
  },

  async getDetails(headerId: number) {
    return await prisma.penjualanDetail.findMany({ where: { penjualanId: headerId } });
  },

  async getLastTransaction() {
    // Jauh lebih efisien daripada memanggil getQueue()
    const lastTx = await prisma.penjualan.findFirst({
      orderBy: { id: 'desc' }
    });
    return lastTx || await this.newTransaction();
  },

  async newTransaction() {
    const user = getLoggedUser();
    return await prisma.penjualan.create({
      data: {
        noInvoice: `DRAFT-${Date.now()}`,
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0),
        createdBy: user.name,
      },
    });
  },

  async getTransaction(id: number) {
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

  async updateHeader(id: number, body: Partial<Penjualan>) {
    return await prisma.$transaction(async (tx) => {
      const updated = await tx.penjualan.update({
        where: { id },
        data: {
          customerId: body.customerId ? Number(body.customerId) : null,
          discount: body.discount !== undefined ? new Prisma.Decimal(body.discount as any) : undefined,
        }
      });
      await syncInvoiceTotalInternal(id, tx);
      return updated;
    });
  },

async addDetails(headerId: any, body: { query: string | number }) {
    // 1. Pastikan headerId dikonversi ke integer secara aman
    const parsedHeaderId = parseInt(headerId, 10);
    if (isNaN(parsedHeaderId)) {
      throw new Error('ID Transaksi (headerId) tidak valid atau kosong');
    }

    return await prisma.$transaction(async (tx) => {
      // 2. Cari produk berdasarkan ID (atau bisa juga ditambahkan fallback pencarian berdasarkan nama/barcode jika query berupa string)
      const isNumericQuery = !isNaN(Number(body.query));
      const product = await tx.product.findFirst({
        where: isNumericQuery 
          ? { id: Number(body.query) } 
          : { name: { contains: String(body.query), mode: 'insensitive' } } // bonus pencarian teks sensitif
      });

      if (!product) throw new Error('Produk tidak ditemukan');

      // 3. Masukkan detail transaksi baru menggunakan parsedHeaderId yang sudah aman
      const newDetail = await tx.penjualanDetail.create({
        data: {
          quantity: 1,
          price: product.price,
          product: { connect: { id: product.id } },
          penjualan: { connect: { id: parsedHeaderId } } // Aman dari NaN!
        }
      });

      await syncInvoiceTotalInternal(parsedHeaderId, tx);
      return newDetail;
    });
  },

  async updateDetails(headerId: number, id: number, body: Partial<PenjualanDetail>) {
    return await prisma.$transaction(async (tx) => {
      const dataUpdate: Prisma.PenjualanDetailUpdateInput = {};
      if (body.quantity !== undefined) dataUpdate.quantity = Number(body.quantity);
      if (body.price !== undefined) dataUpdate.price = new Prisma.Decimal(body.price as any);

      const updatedDetail = await tx.penjualanDetail.update({
        where: { id },
        data: dataUpdate,
      });

      await syncInvoiceTotalInternal(headerId, tx);
      return updatedDetail;
    });
  },

  async deleteDetails(headerId: number, id: number) {
    return await prisma.$transaction(async (tx) => {
      await tx.penjualanDetail.delete({ where: { id } });
      await syncInvoiceTotalInternal(headerId, tx);
      return true;
    });
  },

  async cancelTransaction(id: number) {
    // Idealnya penjualan POS yang dicancel di-update statusnya saja ('CANCELLED'), bukan di hard-delete. 
    // Tapi jika kebutuhan bisnis memang hapus total:
    await prisma.penjualan.delete({ where: { id } });
    return true;
  },

  async saveTransaction(id: number) {
    const finalInvoiceNo = await generateNewInvoiceNumber(SCHEMA);

    return await prisma.penjualan.update({
      where: { id },
      data: { noInvoice: finalInvoiceNo }
    });
  }
};

// Fungsi internal yang aman dijalankan di dalam scope Prisma Transaction Client
async function syncInvoiceTotalInternal(penjualanId: number, txClient: Prisma.TransactionClient): Promise<void> {
  const tx = await txClient.penjualan.findUnique({
    where: { id: penjualanId },
    include: { details: true }
  });

  if (!tx) return;

  const grossTotal = tx.details.reduce((sum, item) => {
    // Ambil nilai numerik Decimal dengan aman
    const price = item.price instanceof Prisma.Decimal ? item.price.toNumber() : Number(item.price);
    return sum + (item.quantity * price);
  }, 0);

  const discount = tx.discount instanceof Prisma.Decimal ? tx.discount.toNumber() : Number(tx.discount);
  const netTotal = Math.max(0, grossTotal - discount);

  await txClient.penjualan.update({
    where: { id: penjualanId },
    data: { total: new Prisma.Decimal(netTotal) }
  });
}