// src/services/penjualan.service.ts
import prisma from '../lib/prisma';
import { userContextStorage } from '../utils/context';
import { createAuditLog } from '../utils/audit';


const _LOGED_USER = { // user yang login, ini hanya contoh, nanti bisa diambil dari context atau session
  name: userContextStorage.getStore()?.email || 'System/Unknown',
  permissions: {
    penjualan: {
      view: true,
      create: true,
      edit: false,
      delete: false
    }
  }
}

export const SCHEMA = {   // tampilan ui from transaction yang ditampilkan dan json yang di kirim ke frontend
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
















export const PenjualanService = {




  async _generateNewInvoiceNumber(tx: any): Promise<string> {
    const today = new Date();
    const yearMonth = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}`;

    const lastInvoice = await tx[SCHEMA.key].findFirst({
      where: { noInvoice: { startsWith: `${SCHEMA.prefix}-${yearMonth}` } },
      orderBy: { id: 'desc' }
    });

    let currentIncrement = 1;
    if (lastInvoice) {
      const lastInvoiceNum = lastInvoice.noInvoice.split('-')[2];
      currentIncrement = parseInt(lastInvoiceNum, 10) + 1;
    }

    return `${SCHEMA.prefix}-${yearMonth}-${String(currentIncrement).padStart(4, '0')}`;
  },






  async getAll(where: any = {}) {
    const transaksi = await prisma.penjualan.findMany({
      where,
      include: { customer: true, details: { include: { product: true } } },
      orderBy: { createdAt: 'desc' }
    });

    if (transaksi.length === 0) {
      await this.createNewTransaction();
      return;
    }

    const activeTx = transaksi[0];

    SCHEMA.queue.data = transaksi.map(t => ({
      id: t.id,
      customer: t.customer?.nmCustomer || 'Unknown'
    }));

    SCHEMA.header.data = {
      id: activeTx.id,
      noInvoice: activeTx.noInvoice,
      date: activeTx.createdAt.toISOString().split('T')[0],
      customerId: activeTx.customerId,
      discount: Number(activeTx.discount),
      total: Number(activeTx.total)
    };

    SCHEMA.details.data = activeTx.details.map(d => ({
      id: d.id,
      productId: d.productId,
      quantity: d.quantity,
      price: Number(d.price),
    }));

    return SCHEMA;
  },








  async createNewTransaction() {
    // Buat transaksi baru tanpa nomor invoice
    const newTx = await prisma.penjualan.create({
      // cast to any to satisfy varying prisma input requirements for a minimal draft transaction
      data: ({
        noInvoice: '',
        discount: 0,
        total: 0,
        createdBy: _LOGED_USER.name,
      } as any),
    })

    SCHEMA.queue.data = [{
      id: newTx.id,
      customer: 'Unknown'
    }];

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





  async getById(id: number) {
    return await prisma.penjualan.findUnique({
      where: { id },
      include: { details: true }
    });
  },


















  async save(body: any) {
    const { customerId, discount, items } = body;

    if (!items || items.length === 0) throw new Error("Keranjang belanja tidak boleh kosong");


    const finalTransactionResult = await prisma.$transaction(async (tx) => {
      let grandSubTotal = 0;
      const detailPayloads = [];

      for (const item of items) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product) throw new Error(`Produk dengan ID ${item.productId} tidak terdaftar.`);
        if (product.status !== 'active') throw new Error(`Produk ${product.name} sedang tidak aktif.`);
        if (product.stok < item.quantity) throw new Error(`Stok "${product.name}" kurang. Sisa: ${product.stok}`);

        await tx.product.update({
          where: { id: item.productId },
          data: { stok: { decrement: item.quantity } }
        });

        const itemSubTotal = Number(product.price) * item.quantity;
        grandSubTotal += itemSubTotal;

        detailPayloads.push({
          productId: item.productId,
          quantity: item.quantity,
          price: product.price,
          subTotal: itemSubTotal
        });
      }

      const totalDiskon = discount ? Number(discount) : 0;
      const netTotal = grandSubTotal - totalDiskon;
      if (netTotal < 0) throw new Error("Diskon tidak boleh melebihi nilai total belanja!");

      const invoiceNo = await this._generateNewInvoiceNumber(tx);

      // ✅ FIX ERROR TS2322: noInvoice dipetakan langsung & customer menggunakan relasi connect berstandar Prisma
      const penjualan = await tx.penjualan.create({
        data: {
          noInvoice: invoiceNo,
          discount: totalDiskon,
          total: netTotal,
          createdBy: _LOGED_USER.name,
          customer: {
            connect: { id: Number(customerId) }
          },
          details: {
            create: detailPayloads.map(d => ({
              productId: d.productId,
              quantity: d.quantity,
              price: d.price,
              subTotal: d.subTotal
            }))
          }
        },
        include: { details: true }
      });

      // Auto-Jurnal Akuntansi
      const jurnalNo = `JV-${invoiceNo.replace(`${SCHEMA.prefix}-`, '')}`;
      await tx.jurnalAkuntansi.create({
        data: {
          noJurnal: jurnalNo,
          keterangan: `Penjualan Otomatis Invoice: ${invoiceNo} Kasir: ${_LOGED_USER.name}`,
          lineItems: {
            create: [
              { akunId: '1101', tipe: 'DEBIT', nominal: netTotal },
              { akunId: '4101', tipe: 'KREDIT', nominal: netTotal }
            ]
          }
        }
      });

      return penjualan;
    });

    await createAuditLog({
      tableName: 'Penjualan',
      action: 'created',
      oldData: null,
      newData: finalTransactionResult
    });

    return finalTransactionResult;
  },









  async cancel(id: number) {
    throw new Error("Nota penjualan tidak boleh dihapus demi integritas audit keuangan. Gunakan Pembatalan/Void!");
  },





  async update(id: number, body: any) {
    throw new Error("Transaksi penjualan yang sudah sah tidak diizinkan untuk diubah secara langsung. Gunakan sistem Retur!");
  },





  async delete(id: number) {
    throw new Error("Nota penjualan tidak boleh dihapus demi integritas audit keuangan. Gunakan Pembatalan/Void!");
  }




};