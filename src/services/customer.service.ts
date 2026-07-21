import { Customer, Prisma } from '@prisma/client';
import { MasterSchema, MasterService } from '../interface/base.interface';
import prisma from '../lib/prisma';
import { parseFilterToPrisma } from '../utils/prismaFilterParser';

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
    // Menggabungkan filter kustom dengan kondisi soft delete (deletedAt: null)
    const prismaFilter = parseFilterToPrisma(filter) || {};

    const customers = await prisma.customer.findMany({
      where: {
        ...prismaFilter,
      },
      orderBy: { createdAt: 'asc' }
    });

    return customers; // Murni Customer[] tanpa mapping ulang
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
        nmCustomer: 'New Customer',
        email: '',
      }
    });

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

    return updatedCustomer;
  },

  async delete(key: string | number): Promise<boolean> {
    const id = Number(key);
    const oldData = await prisma.customer.findFirst({
      where: { id }
    });

    if (!oldData) throw new Error('Customer tidak ditemukan');

    // Sesuai catatan di schema.prisma: "Untuk Soft Delete data master"
    // Kita gunakan soft delete dengan mengisi field `deletedAt`
    await prisma.customer.delete({
      where: { id },
    });

    return true;
  },


  searchData: async function (keyword: string): Promise<any> {
    const data = await prisma.customer.findMany(
      { 
        where: {
          OR: [
            { id: Number(keyword) },
            { nmCustomer: { contains: keyword, mode: 'insensitive' } },
          ]
        }
      }
    )
    return data
  }
};