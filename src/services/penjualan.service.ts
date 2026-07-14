// src/services/penjualan.service.ts
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
      { key: 'name', label: 'Nama', type: 'display', primary: true, readonly: true },
      {
        key: 'productId', label: 'Pilih Produk', type: 'relation', relation: {
          entity: 'product', valueField: 'id', displayField: 'name', api: '/api/product',
        }, validation: { required: true }
      },
      { key: 'quantity', label: 'Qty', type: 'number', validation: { required: true, min: 1 } },
      { key: 'price', label: 'Harga Satuan', type: 'currency', readonly: true },
      { key: 'subtotal', label: 'Subtotal', readonly: true, type: 'computed', formula: '{quantity} * {price}' }
    ],
    data: [] as any[]
  }
};

export const PenjualanService: TransactionService = {
  getModuleSchema: function (): TransactionSchema {
    return SCHEMA;
  },

  getQueue: async (): Promise<typeof SCHEMA.queue.data> => {
    const activeTransactions = await prisma.penjualan.findMany({
      // where: { 
      //   // Sesuaikan kondisi antrian Anda, misal status belum final/belum dibayar
      //   isFinalSubmit: false 
      // },
      include: {
        customer: true // jika antrian butuh nama customer
      },
      orderBy: { id: 'desc' }
    });


    const data = activeTransactions.map(t => ({
      id: t.id,
      customer: t.customer?.nmCustomer || ''
    }))
    return data
  },

  // Implementasi wajib dari TransactionService interface
  getHeader: async (): Promise<any> => {
    return SCHEMA.header.data;
  },

  // Implementasi wajib dari TransactionService interface dengan 1 parameter (id)
  // Menampilkan data detail ter-format dari cache SCHEMA internal
  getDetails: async (headerId: number): Promise<any> => {
    return SCHEMA.details.data;
  },

  getLastTransaction: async (): Promise<any> => {
    const queue = await PenjualanService.getQueue(); // FIX: Tambahkan await di sini
    if (queue && queue.length > 0) {
      return PenjualanService.getTransaction(queue[0].id); // Ambil transaksi pertama dari queue terbaru
    } else {
      return PenjualanService.newTransaction();
    }
  },

  newTransaction: async (data?: any): Promise<any> => {
    const newTx = await prisma.penjualan.create({
      data: {
        noInvoice: `DRAFT-${Date.now()}`,
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
    const queue = await PenjualanService.getQueue();
    const transaction = await prisma.penjualan.findUnique({
      where: { id: Number(id) },
      include: {
        customer: true,
        details: { include: { product: true } }
      }
    });

    if (!transaction) throw new Error('Transaction tidak ditemukan');
    SCHEMA.queue.data=queue;

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
      name: d.product.name,
      productId: d.productId,
      quantity: d.quantity,
      price: Number(d.price),
      subTotal: d.quantity * Number(d.price)
    }));

    return SCHEMA;
  },

  updateHeader: async (id: number, body: any): Promise<any> => {
    await prisma.penjualan.update({
      where: { id: Number(id) },
      data: {
        customerId: body.customerId ? Number(body.customerId) : null,
        discount: body.discount !== undefined ? Number(body.discount) : undefined,
      }
    });

    // Sinkronisasi ulang total bersih (karena diskon mungkin berubah)
    await syncInvoiceTotal(Number(id));

    return PenjualanService.getTransaction(Number(id));
  },

  addDetails: async (headerId: number, body: any): Promise<any> => {
    const product = await prisma.product.findFirst({
      where: {
        id: Number(body.query),
      }
    });

    if (!product) throw new Error('Produk tidak ditemukan');

    await prisma.penjualanDetail.create({
      data: {
        quantity: 1,
        price: product.price,
        // Hubungkan relasi ke Product menggunakan nested relation connect
        product: {
          connect: { id: Number(product.id) }
        },
        // Hubungkan relasi ke Penjualan menggunakan nested relation connect
        penjualan: {
          connect: { id: Number(headerId) }
        }
      }
    });
    await syncInvoiceTotal(Number(headerId));

    return PenjualanService.getTransaction(Number(headerId));
  },

  async updateDetails(headerId: number, detailsId: number, body: any) {
    // Ambil payload dinamis yang dikirim frontend
    // data akan berisi objek seperti { quantity: 5 } atau { discount: 10000 }

    await prisma.penjualanDetail.update({
      where: {
        id: Number(detailsId), // Tetap gunakan detailsId dari parameter URL untuk mencari barisnya
      },
      data: body, // Dilempar langsung secara dinamis ke Prisma
    });

    // Urusan subtotal dll nanti akan otomatis terhitung via computed/extension layer Prisma
    // saat kita memanggil getTransaction(headerId) di bawah ini:
    return this.getTransaction(headerId);
  },

  deleteDetails: async (headerId: number, id: number): Promise<any> => {
    await prisma.penjualanDetail.delete({ where: { id: Number(id) } });

    await syncInvoiceTotal(Number(headerId));
    return PenjualanService.getTransaction(Number(headerId));
  },

  cancelTransaction: async (id: number, body: any): Promise<any> => {
    await prisma.penjualan.delete({ where: { id: Number(id) } });
    return { success: true, message: `Transaksi ID ${id} berhasil dibatalkan` };
  },

  saveTransaction: async (id: number, body: any): Promise<any> => {
    const finalInvoiceNo = await generateNewInvoiceNumber(SCHEMA);

    await prisma.penjualan.update({
      where: { id: Number(id) },
      data: { noInvoice: finalInvoiceNo }
    });

    return PenjualanService.getTransaction(Number(id));
  }
};

async function syncInvoiceTotal(penjualanId: number) {
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
    data: { total: netTotal }
  });
}