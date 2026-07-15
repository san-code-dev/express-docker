export interface MenuItem {
  key: string;
  icon: string;
  label: string;
  type: string;
  route: string;
  api: string;
  menuCategory: string;
}


export interface MasterSchema {
  icon?: string;
  key: string;
  label: string;
  type: 'master';
  isMenuHidden: boolean,
  permissions: { create: boolean; edit: boolean; delete: boolean;[key: string]: boolean };
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
  isMenuHidden: boolean,
  permissions: { create: boolean; edit: boolean; delete: boolean;[key: string]: boolean };
  actions?: Array<{ key: string; label: string; type: string }>;
  queue: { label: string, schema: any[], data?: any[] };
  header: { label: string, schema: any[], data?: any };
  details: { label: string, schema: any[], data?: any[] };
}

export interface MasterService {
  getModuleSchema(): MasterSchema;
  getAll(param?: any): Promise<any>;
  create(body?: any): Promise<any>;
  update(id: number, body: any): Promise<any>;
  delete(id: number): Promise<any>;
}

export interface TransactionService {
  getModuleSchema(): TransactionSchema;
  getQueue(): any;
  getHeader(): any;
  getDetails(id: number): any;



  newTransaction(body?: any): any;
  getTransaction(id: number): any;
  getLastTransaction(): any;
  cancelTransaction(id: number, body: any): any;
  saveTransaction(id: number, body: any): any;
  updateHeader(id: number, body: any): any;
  getDetails(headerId: number): any;
  addDetails(headerId: number, body: any): any;
  updateDetails(headerId: number, id: number, body: any): any;
  deleteDetails(headerId: number, id: number): any;
}