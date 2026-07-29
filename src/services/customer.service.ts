// src/services/customer.service.ts
import { Customer, Prisma } from '@prisma/client';
import { MasterSchema, MasterService } from '../interface/base.interface';
import prisma from '../lib/prisma';
import { parseFilterToPrisma } from '../utils/prismaFilterParser';
import { getSocketInstance } from '../lib/socket';

// 1. Terapkan Generic <Customer> langsung dari Prisma ke SCHEMA
export const SCHEMA: MasterSchema<Customer> = {
  key: 'customer',
  label: 'Data Customer',
  type: 'master',
  icon: 'iconify:carbon:user-multiple',
  permissions: { create: true, edit: true, delete: true },
  isMenuHidden: false,
  schema: [
    { key: 'id', label: 'ID', type: 'display', required: true, readonly: true, nullable: false },
    { key: 'nmCustomer', label: 'Customer Name', type: 'text', required: true, size: 250 },
    { key: 'email', label: 'Email Address', type: 'text', required: true, size: 250 },
    { key: 'telepon', label: 'No Telp', type: 'text', size: 200 },
    { key: 'alamat', label: 'Address', type: 'textarea' },
  ],
  // Data dibiarkan kosong secara default
};

// 2. Terapkan Generic <Customer> pada implementasi Service
export const CustomerService: MasterService<Customer> = {
  getModuleSchema: function (): MasterSchema<Customer> {
    return SCHEMA;
  },

  async getAll(filter?: Record<string, any>): Promise<Customer[]> {
    const prismaFilter = parseFilterToPrisma(filter) || {};

    const customers = await prisma.customer.findMany({
      where: {
        ...prismaFilter,
      },
      orderBy: { createdAt: 'asc' }
    });

    SCHEMA.data = customers;
    
    // Broadcast data terbaru saat getAll dipanggil
    triggerRealtimeEmit();

    return customers;
  },

  async getById(key: string | number): Promise<Customer | null> {
    return await prisma.customer.findFirst({
      where: {
        id: Number(key),
      }
    });
  },

  async create(body: Partial<Customer>): Promise<Customer> {
    const customer = await prisma.customer.create({
      data: {
        nmCustomer: body.nmCustomer || 'New Customer',
        email: body.email || '',
        telepon: body.telepon,
        alamat: body.alamat,
      }
    });

    // Perbarui data di schema dan trigger realtime ke frontend
    await refreshSchemaData();
    triggerRealtimeEmit();

    return customer;
  },

  async update(key: string | number, body: Partial<Customer>): Promise<Customer> {
    const id = Number(key);
    const oldData = await prisma.customer.findFirst({
      where: { id }
    });

    if (!oldData) throw new Error('Customer tidak ditemukan atau telah dihapus');

    const dataUpdate: Prisma.CustomerUpdateInput = {};

    if (body.nmCustomer !== undefined) dataUpdate.nmCustomer = body.nmCustomer;
    if (body.email !== undefined) dataUpdate.email = body.email;
    if (body.telepon !== undefined) dataUpdate.telepon = body.telepon;
    if (body.alamat !== undefined) dataUpdate.alamat = body.alamat;

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: dataUpdate
    });

    // Perbarui data di schema dan trigger realtime ke frontend
    await refreshSchemaData();
    triggerRealtimeEmit();

    return updatedCustomer;
  },

  async delete(key: string | number): Promise<boolean> {
    const id = Number(key);
    const oldData = await prisma.customer.findFirst({
      where: { id }
    });

    if (!oldData) throw new Error('Customer tidak ditemukan');

    await prisma.customer.delete({
      where: { id },
    });

    // Perbarui data di schema dan trigger realtime ke frontend
    await refreshSchemaData();
    triggerRealtimeEmit();

    return true;
  },

  searchData: async function (keyword: string): Promise<MasterSchema<Customer>> {
    const cleanKeyword = keyword.trim();
    let data: Customer[] = [];

    if (cleanKeyword) {
        const numId = Number(cleanKeyword);
        const isValidNumber = !isNaN(numId);

        const orConditions: Prisma.CustomerWhereInput[] = [
            { nmCustomer: { contains: cleanKeyword, mode: 'insensitive' } },
            { email: { contains: cleanKeyword, mode: 'insensitive' } },
            { telepon: { contains: cleanKeyword, mode: 'insensitive' } },
            { alamat: { contains: cleanKeyword, mode: 'insensitive' } },
        ];

        if (isValidNumber) {
            orConditions.push({ id: numId });
        }

        data = await prisma.customer.findMany({
            where: {
                OR: orConditions,
            },
        });
    } else {
        data = await this.getAll();
    }

    if (!data || data.length === 0) {
        throw new Error('Customer tidak ditemukan');
    }

    SCHEMA.data = data;

    const schemaResponse: MasterSchema<Customer> = {
        ...structuredClone(SCHEMA),
        data: data,
    };

    return schemaResponse;
  }
};

// Helper untuk menyegarkan data list di dalam global SCHEMA
async function refreshSchemaData() {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'asc' }
  });
  SCHEMA.data = customers;
}

// Helper untuk mengirim event realtime via WebSocket
function triggerRealtimeEmit() {
  const io = getSocketInstance();
  if (io) {
    io.emit('customer_getAll_updated', SCHEMA);
  }
}