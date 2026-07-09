// src/services/base.interface.ts
export interface ERPModuleSchema {
  key: string;
  label: string;
  type: 'master' | 'transaction';
  permissions: { create: boolean; edit: boolean; delete: boolean; [key: string]: boolean };
  actions?: Array<{ key: string; label: string; type: string }>;
  schema?: any[];       // Untuk tipe master
  queue?: any;          // Untuk tipe transaksi
  header?: any;         // Untuk tipe transaksi
  details?: any;        // Untuk tipe transaksi
  data?: any;
}

export interface IBaseService {
  getModuleSchema(): ERPModuleSchema;
  getAll(where?: any): Promise<ERPModuleSchema>;
  getById(id: number): Promise<any>;
  create(data?: any): Promise<any>;
  update(id: number, data: any): Promise<any>;
  delete(id: number): Promise<any>;
}