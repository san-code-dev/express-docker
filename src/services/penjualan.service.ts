// src/services/penjualan.service.ts
import prisma from '../lib/prisma';
import { userContextStorage } from '../utils/context';
import { TransactionSchema, TransactionService } from '../interface/base.interface';

const _LOGED_USER = {
  name: userContextStorage.getStore()?.email || 'System/Unknown',
  permissions: {
    penjualan: { view: true, create: true, edit: false, delete: false }
  }
};

export const SCHEMA: TransactionSchema = {
  key: 'penjualan',
  prefix: 'PJ',
  label: 'Transaksi Penjualan (POS)',
  type: 'transaction',
  icon: 'iconify:mdi-cash-register',
  permissions: _LOGED_USER.permissions['penjualan'],
  actions: [
    { key: 'print', label: 'Cetak Nota', type: 'printer' },
    { key: 'pay', label: 'Bayar Langsung', type: 'payment' },
  ],
  queue: {
    label: 'ANTRIAN TRANSAKSI',
    schema: [
      { key: 'id', label: 'ID Order', type: 'display', primary: true },
      { key: 'customer', label: 'Pelanggan', type: 'text' },
    ],
    data: [] as any[]
  },
  header: {
    label: 'INFORMASI UTAMA NOTA',
    schema: [
      { key: 'id', label: 'ID', type: 'display', primary: true, readonly: true },
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
    data: {} as any
  },
  details: {
    label: 'DAFTAR BARANG BELANJA',
    schema: [
      { key: 'id', label: 'ID', type: 'display', primary: true, readonly: true },
      {
        key: 'productId', label: 'Pilih Produk', type: 'relation', relation: {
          entity: 'product', valueField: 'id', displayField: 'name', api: '/api/product',
        }, validation: { required: true }
      },
      { key: 'quantity', label: 'Qty', type: 'number', validation: { required: true, min: 1 } },
      { key: 'price', label: 'Harga Satuan', type: 'currency', readonly: true },
      { key: 'subTotal', label: 'Subtotal', type: 'currency', readonly: true },
    ],
    data: [] as any[]
  }
};

export const PenjualanService: TransactionService = {
  getModuleSchema: function (): TransactionSchema {
    return SCHEMA;
  },

  getQueue: async (): Promise<any> => {
    const queueData = await prisma.penjualan.findMany({
      include: { customer: true },
      orderBy: { createdAt: 'desc' }
    });
    
    SCHEMA.queue.data = queueData.map(q => ({
      id: q.id,
      customer: q.customer?.nmCustomer || 'Unknown / General Customer'
    }));

    return SCHEMA.queue.data;
  },

  newTransaction: async (data?: any): Promise<any> => {
    const newTx = await prisma.penjualan.create({
      data: {
        noInvoice: `DRAFT-${Date.now()}`, // Template invoice sementara sebelum checkout final
        discount: 0,
        total: 0,
        createdBy: _LOGED_USER.name,
      },
    });

    SCHEMA.header.data = {
      id: newTx.id,
      noInvoice: newTx.noInvoice,
      date: newTx.createdAt.toISOString().split('T')[0],
      customerId: newTx.customerId,
      discount: Number(newTx.discount),
      total: Number(newTx.total)
    };
    SCHEMA.details.data = [];

    return SCHEMA;
  },

  getTransaction: async (id: number): Promise<any> => {
    const transaction = await prisma.penjualan.findUnique({
      where: { id },
      include: {
        customer: true,
        details: { include: { product: true } }
      }
    });

    if (!transaction) throw new Error('Transaksi tidak ditemukan');

    SCHEMA.header.data = {
      id: transaction.id,
      noInvoice: transaction.noInvoice,
      date: transaction.createdAt.toISOString().split('T')[0],
      customerId: transaction.customerId,
      discount: Number(transaction.discount),
      total: Number(transaction.total)
    };

    SCHEMA.details.data = transaction.details.map(d => ({
      id: d.id,
      productId: d.productId,
      quantity: d.quantity,
      price: Number(d.price),
      subTotal: d.quantity * Number(d.price) // Kalkulasi runtime virtual subtotal untuk UI Frontend
    }));

    return SCHEMA;
  },

  updateHeader: async (id: number, data: any): Promise<any> => {
    const updated = await prisma.penjualan.update({
      where: { id },
      data: {
        customerId: data.customerId ? Number(data.customerId) : undefined,
        discount: data.discount !== undefined ? Number(data.discount) : undefined,
      }
    });
    
    // Recalculate total invoice jika diskon berubah
    return PenjualanService.getTransaction(id);
  },

  getDetails: async (headerId: number): Promise<any> => {
    const res = await PenjualanService.getTransaction(headerId);
    return res.details.data;
  },

  addDetails: async (headerId: number, data: any): Promise<any> => {
    // 1. Ambil data harga asli produk dari master product
    const product = await prisma.product.findUnique({ where: { id: Number(data.productId) } });
    if (!product) throw new Error('Produk tidak ditemukan');

    // 2. Tambahkan detail item baru
    await prisma.penjualanDetail.create({
      data: {
        penjualanId: headerId,
        productId: Number(data.productId),
        quantity: Number(data.quantity),
        price: product.price
      }
    });

    // 3. Update summary total di header penjualan
    await syncInvoiceTotal(headerId);

    return PenjualanService.getTransaction(headerId);
  },

  updateDetails: async (headerId: number, id: number, data: any): Promise<any> => {
    await prisma.penjualanDetail.update({
      where: { id },
      data: {
        quantity: data.quantity ? Number(data.quantity) : undefined
      }
    });

    await syncInvoiceTotal(headerId);
    return PenjualanService.getTransaction(headerId);
  },

  deleteDetails: async (headerId: number, id: number): Promise<any> => {
    await prisma.penjualanDetail.delete({ where: { id } });
    
    await syncInvoiceTotal(headerId);
    return PenjualanService.getTransaction(headerId);
  },

  cancelTransaction: async (id: number, data: any): Promise<any> => {
    // Hapus total invoice beserta detailnya (Cascade delete aktif dari Prisma Schema)
    await prisma.penjualan.delete({ where: { id } });
    return { success: true, message: `Transaksi ID ${id} berhasil dibatalkan` };
  },

  saveTransaction: async (id: number, data: any): Promise<any> => {
    // Mengubah nomor invoice draft menjadi invoice resmi POS ter-urut
    const count = await prisma.penjualan.count();
    const finalInvoiceNo = `PJ-${String(count + 1).padStart(5, '0')}`;

    await prisma.penjualan.update({
      where: { id },
      data: { noInvoice: finalInvoiceNo }
    });

    return PenjualanService.getTransaction(id);
  }
};

// ====================================================================
// REUSABLE HELPER: Sinkronisasi Total Belanja setelah mutasi detail item
// ====================================================================
async function syncInvoiceTotal(penjualanId: number) {
  const tx = await prisma.penjualan.findUnique({
    where: { id: penjualanId },
    include: { details: true }
  });

  if (!tx) return;

  // Hitung total kotor dari total seluruh item detail
  const grossTotal = tx.details.reduce((sum, item) => {
    return sum + (item.quantity * Number(item.price));
  }, 0);

  // Kurangi diskon untuk mendapatkan total bersih
  const netTotal = Math.max(0, grossTotal - Number(tx.discount));

  await prisma.penjualan.update({
    where: { id: penjualanId },
    data: { total: netTotal }
  });
}