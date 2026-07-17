// src/services/index.ts
import { SCHEMA as ProductSchema, ProductService } from './product.service';
import { SCHEMA as PenjualanSchema, PenjualanService } from './penjualan.service';
import { SCHEMA as CustomerSchema, CustomerService } from './customer.service';
  
// Daftar modul yang aktif di aplikasi Anda
export const ModuleRegistry = [
  {
    schema: ProductSchema,
    service: ProductService
  },
  {
    schema: PenjualanSchema,
    service: PenjualanService
  },
  {
    schema: CustomerSchema,
    service: CustomerService
  }
];