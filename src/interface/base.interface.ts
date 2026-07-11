export interface MasterSchema {
  icon?: string;
  key: string;
  label: string;
  type: 'master';
  permissions: { create: boolean; edit: boolean; delete: boolean; [key: string]: boolean };
  actions?: Array<{ key: string; label: string; type: string }>;
  schema: any[];
  data?: any[];
}

export interface TransactionSchema {
  icon?: string;
  key: string;
  label: string;
  prefix: string;
  type: 'transaction';
  permissions: { create: boolean; edit: boolean; delete: boolean; [key: string]: boolean };
  actions?: Array<{ key: string; label: string; type: string }>;
  queue: {label: string, schema: any[], data?: any[]};
  header: {label: string, schema: any[], data?: any};
  details: {label: string, schema: any[], data?: any[]};
}

export interface MasterService {
  getModuleSchema(): MasterSchema;
  getAll(where?: any): Promise<any>;
  create(data?: any): Promise<any>;
  update(id: number, data: any): Promise<any>;
  delete(id: number): Promise<any>;
}

export interface TransactionService {
  getModuleSchema(): TransactionSchema;
  getQueue(): Promise<any>;
  newTransaction(data?: any): Promise<any>;
  getTransaction(id: number): Promise<any>;
  cancelTransaction(id: number, data: any): Promise<any>;
  saveTransaction(id: number, data: any): Promise<any>;
  updateHeader(id: number, data: any): Promise<any>;
  getDetails(headerId: number): Promise<any>;
  addDetails(headerId: number, data: any): Promise<any>;
  updateDetails(headerId: number, id: number, data: any): Promise<any>;
  deleteDetails(headerId: number, id: number): Promise<any>;
}