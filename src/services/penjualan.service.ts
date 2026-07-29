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

export const SCHEMA: TransactionSchema<Penjualan, PenjualanDetail> = {
  key: 'penjualan',
  prefix: 'PJ',
  label: 'Transaksi Penjualan (POS)',
  type: 'transaction',
  icon: 'iconify:mdi-cash-register',
  permissions: { view: true, create: true, edit: false, delete: false },
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
      { key: 'total', label: 'Total Bayar', type: 'currency', readonly: true, highlight: true, isHidden: true },
    ],
    data: null
  },
  details: {
    label: 'DAFTAR BARANG BELANJA',
    schema: [
      { key: 'id', label: 'id', type: 'primary', primary: true, readonly: true, nullable: false },
      { key: 'productId', label: 'Kode Barang', type: 'text', readonly: true },
      { key: 'nmProduct', label: 'Nama Barang', type: 'text', readonly: true, size: 250 },
      { key: 'quantity', label: 'Qty', type: 'number', validation: { required: true, min: 1 }, size: 80 },
      { key: 'price', label: 'Harga Satuan', type: 'currency', readonly: true, size: 150 },
      { key: 'subtotal', label: 'Subtotal', readonly: true, type: 'computed', formula: '{quantity} * {price}', size: 250 }
    ],
    data: []
  },
};






export const PenjualanService: TransactionService<Penjualan, PenjualanDetail> = {
  getModuleSchema() {
    return SCHEMA;
  },


  async getAll() {
    await this.getLastTransaction();
    await this.getQueue();
    return SCHEMA;
  },


  async getQueue() {
    const activeTransactions = await prisma.penjualan.findMany({
      include: { customer: true },
    });

    const queue = activeTransactions.map(t => ({
      id: t.id,
      label: (t.customer as Customer | null)?.nmCustomer || 'Pelanggan Umum'
    }))

    SCHEMA.queue.data = queue;
    return SCHEMA.queue;
  },



  async getLastTransaction() {
    let lastTransaction = await prisma.penjualan.findFirst({
      orderBy: { id: 'desc' },
      include: { details: true }
    });

    // Jika ada transaksi terakhir, masukkan ke SCHEMA
    if (lastTransaction) {
      SCHEMA.header.data = lastTransaction;
      SCHEMA.details.data = lastTransaction.details || [];

      return {
        header: SCHEMA.header,
        details: SCHEMA.details
      };
    }

    // Jika kosong, buat transaksi baru yang otomatis set ke SCHEMA
    return await this.newTransaction();
  },




  async getTransaction(id: number) {
    const transaction = await prisma.penjualan.findUnique({ where: { id: id }, include: { details: true } })
    SCHEMA.header.data = transaction;
    SCHEMA.details.data = transaction?.details || [];

    return {
      header: SCHEMA.header,
      details: SCHEMA.details
    };
  },


  async getHeader(id: number) {
    const header = await prisma.penjualan.findUnique({ where: { id: id } })
    SCHEMA.header.data = header
    return SCHEMA.header
  },


  async getDetails(headerId: number) {
    const details = await prisma.penjualanDetail.findMany({ where: { penjualanId: headerId } })
    SCHEMA.details.data = details
    return SCHEMA.details
  },



  async newTransaction() {
    const user = getLoggedUser();
    const transaction = await prisma.penjualan.create({
      data: {
        noInvoice: `DRAFT-${Date.now()}`,
        discount: new Prisma.Decimal(0),
        total: new Prisma.Decimal(0),
        createdBy: user ? user.name : 'System',
      },
      include: { details: true }
    });

    // Langsung set ke SCHEMA karena method ini dipakai juga untuk action lain
    SCHEMA.header.data = transaction;
    SCHEMA.details.data = transaction.details || [];

    return {
      header: SCHEMA.header,
      details: SCHEMA.details
    };
  },









  async updateHeader(id: number, body: Partial<Penjualan>) {
    const header = await prisma.$transaction(async (tx) => {
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

    SCHEMA.header.data = header;
    return SCHEMA.header;
  },








  async addDetails(headerId: any, body: { query: string | number; }) {

    const parsedHeaderId = parseInt(headerId, 10);
    if (isNaN(parsedHeaderId)) {
      throw new Error('ID Transaksi (headerId) tidak valid atau kosong');
    }

    await prisma.$transaction(async (tx) => {
      const isNumericQuery = !isNaN(Number(body.query));
      const product = await tx.product.findFirst({
        where: isNumericQuery
          ? { id: Number(body.query) }
          : { name: { contains: String(body.query), mode: 'insensitive' } }
      });

      if (!product) throw new Error('Produk tidak ditemukan');

      await tx.penjualanDetail.create({
        data: {
          nmProduct: product.name,
          quantity: 1,
          price: product.price,
          product: { connect: { id: product.id } },
          penjualan: { connect: { id: parsedHeaderId } }
        }
      });

      await syncInvoiceTotalInternal(parsedHeaderId, tx);
    });
    return await this.getTransaction(headerId)
  },





  async updateDetails(headerId: number, id: number, body: Partial<PenjualanDetail>) {
    await prisma.$transaction(async (tx) => {
      const dataUpdate: Prisma.PenjualanDetailUpdateInput = {};
      if (body.quantity !== undefined) dataUpdate.quantity = Number(body.quantity);
      if (body.price !== undefined) dataUpdate.price = new Prisma.Decimal(body.price as any);

      await tx.penjualanDetail.update({
        where: { id },
        data: dataUpdate,
      });

      await syncInvoiceTotalInternal(headerId, tx);
    });
    return await this.getTransaction(headerId)
  },





  async deleteDetails(headerId: number, id: number) {
    await prisma.$transaction(async (tx) => {
      await tx.penjualanDetail.delete({ where: { id } });
      await syncInvoiceTotalInternal(headerId, tx);
    });
    return await this.getTransaction(headerId)
  },




  async cancelTransaction(id: number) {
    await prisma.penjualan.delete({ where: { id } });
    return await this.getLastTransaction()
  },



  async saveTransaction(id: number) {
    const finalInvoiceNo = await generateNewInvoiceNumber(SCHEMA);
    await prisma.penjualan.update({
      where: { id },
      data: { noInvoice: finalInvoiceNo }
    });

    return await this.getLastTransaction()
  },

};

// Fungsi internal yang aman dijalankan di dalam scope Prisma Transaction Client
async function syncInvoiceTotalInternal(penjualanId: number, txClient: Prisma.TransactionClient): Promise<void> {
  const tx = await txClient.penjualan.findUnique({
    where: { id: penjualanId },
    include: { details: true }
  });

  if (!tx) return;

  const grossTotal = tx.details.reduce((sum, item) => {
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