// src/services/index.ts
import { SCHEMA as ProductSchema, ProductService } from './product.service';
import { SCHEMA as PenjualanSchema, PenjualanService } from './penjualan.service';
import { SCHEMA as AuditLogsSchema, AuditLogsService } from './audit-logs.service';

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
    schema: AuditLogsSchema,
    service: AuditLogsService
  }
];