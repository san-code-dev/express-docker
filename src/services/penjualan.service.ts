// src/services/penjualan.service.ts
import { Prisma, Penjualan, PenjualanDetail, Customer } from '@prisma/client';
import prisma from '../lib/prisma';
import { userContextStorage } from '../utils/context';
import { TransactionSchema, TransactionService } from '../interface/base.interface';
import { generateNewInvoiceNumber, sendResponse } from '../utils/erpUtils';
import { getSocketInstance } from '../lib/socket';

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
      { key: 'total', label: 'Total Bayar', type: 'currency', readonly: true, highlight: true },
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

    triggerRealtimeEmit();
    return SCHEMA;
  },

async getQueue() {
    const activeTransactions = await prisma.penjualan.findMany({
      include: { customer: true },
      orderBy: { id: 'asc' }, // Pastikan urutan berdasarkan ID atau waktu pembuatan agar nomor antrean konsisten
    });

    const queue = activeTransactions.map((t, index) => {
      const customerName = (t.customer as Customer | null)?.nmCustomer;
      const queueNumber = index + 1; // Menghasilkan nomor urut (1, 2, 3, dst.)

      return {
        id: t.id,
        // Format label menjadi: "No. 1 - Nama Customer" atau fallback ke nomor urut jika customer kosong
        label: customerName 
          ? `No. ${queueNumber} #${customerName}` 
          : `No. ${queueNumber}`
      };
    });

    SCHEMA.queue.data = queue;
  },


  async getLastTransaction() {
    let lastTransaction = await prisma.penjualan.findFirst({
      where: {
        noInvoice: { startsWith: 'DRAFT-' }
      },
      orderBy: { id: 'desc' },
      include: { details: true }
    });

    if (lastTransaction) {
      SCHEMA.header.data = lastTransaction;
      SCHEMA.details.data = lastTransaction.details || [];
    } else {
      await this.newTransaction();
    }
  },

  async getTransaction(id: number) {
    const transaction = await prisma.penjualan.findUnique({ where: { id: id }, include: { details: true } });
    SCHEMA.header.data = transaction;
    SCHEMA.details.data = transaction?.details || [];
    triggerRealtimeEmit();
  },

  async getHeader(id: number) {
    const header = await prisma.penjualan.findUnique({ where: { id: id } });
    SCHEMA.header.data = header;
  },

  async getDetails(headerId: number) {
    const details = await prisma.penjualanDetail.findMany({ where: { penjualanId: headerId } });
    SCHEMA.details.data = details;
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

    SCHEMA.header.data = transaction;
    SCHEMA.details.data = transaction.details || [];
    await this.getQueue();
    triggerRealtimeEmit();
  },

  async updateHeader(id: number, body: Partial<Penjualan>) {
    const header = await prisma.$transaction(async (tx) => {
      const updated = await tx.penjualan.update({
        where: { id },
        data: {
          customerId: body.customerId ? Number(body.customerId) : null,
          discount: body.discount !== undefined ? new Prisma.Decimal(body.discount as any) : undefined,
          createdAt: body.createdAt ? new Date(body.createdAt) : undefined,
        }
      });
      await syncInvoiceTotalInternal(id, tx);
      return updated;
    });

    SCHEMA.header.data = header;
    await this.getQueue();
    triggerRealtimeEmit();
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

    await this.getTransaction(parsedHeaderId);
    triggerRealtimeEmit();
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

    await this.getTransaction(headerId);
    triggerRealtimeEmit();
  },

  async deleteDetails(headerId: number, id: number) {
    await prisma.$transaction(async (tx) => {
      const existing = await tx.penjualanDetail.findUnique({
        where: { id: Number(id) }
      });

      if (!existing) {
        throw new Error(`Detail penjualan dengan ID ${id} tidak ditemukan.`);
      }

      await tx.penjualanDetail.delete({
        where: { id: Number(id) }
      });

      await syncInvoiceTotalInternal(headerId, tx);
    });

    await this.getTransaction(headerId);
    triggerRealtimeEmit();
  },

  async cancelTransaction(id: number) {
    await prisma.penjualan.delete({ where: { id } });
    await this.getLastTransaction();
    await this.getQueue();

    triggerRealtimeEmit();
  },

  async saveTransaction(id: number) {
    const finalInvoiceNo = await generateNewInvoiceNumber(SCHEMA);
    await prisma.penjualan.update({
      where: { id },
      data: { noInvoice: finalInvoiceNo }
    });

    await this.getLastTransaction();
    triggerRealtimeEmit();
  },
};

function triggerRealtimeEmit() {
  const io = getSocketInstance();
  if (io) {
    // Disesuaikan agar menggunakan key dinamis 'realtime_update:penjualan'
    io.emit(`realtime_update:${SCHEMA.key}`, {
      data: {
        queue: SCHEMA.queue,
        header: SCHEMA.header,
        details: SCHEMA.details,
      }
    });
  }
}

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