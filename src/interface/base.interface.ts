export interface Options {
  label: string;
  value: string;
}

// Interface standar untuk struktur item antrean/list ringkas
export interface BaseQueueItem {
  id: number;
  label: string;
}

// keyof T -> Memberikan auto-complete kolom dari Model Prisma
// (string & {}) -> Tetap fleksibel jika ada kolom kustom/virtual/komputasi
interface BaseColumnSchema<T = any> {
  key: keyof T | (string & {});
  label: string;
  highlight?: boolean;
  validation?: any;
  size?: number;
  isHidden?: boolean;
}

interface PrimaryColumnSchema<T = any> extends BaseColumnSchema<T> {
  primary: true;
  readonly: true;
  nullable: false;
  required?: boolean;
  type?: 'text' | 'number' | string;
  formula?: never;
  options?: never;
  relation?: never;
}

interface DisplayColumnSchema<T = any> extends BaseColumnSchema<T> {
  type: 'display';
  required: true;
  readonly: true;
  nullable?: boolean;
  primary?: never;
  formula?: never;
  options?: never;
  relation?: never;
}

interface ComputedColumnSchema<T = any> extends BaseColumnSchema<T> {
  type: 'computed';
  formula: string; // Wajib string formula
  readonly?: boolean;
  required?: boolean;
  nullable?: boolean;
  primary?: never;
  options?: never;
  relation?: never;
}

interface RelationColumnSchema<T = any> extends BaseColumnSchema<T> {
  type: 'relation';
  relation: { entity: string; valueField: string; displayField: string; api: string };
  primary?: boolean;
  readonly?: boolean;
  required?: boolean;
  nullable?: boolean;
  formula?: never;
  options?: never;
}

interface SelectColumnSchema<T = any> extends BaseColumnSchema<T> {
  type: 'select';
  options: Options[]; // Wajib array options
  primary?: boolean;
  readonly?: boolean;
  required?: boolean;
  nullable?: boolean;
  formula?: never;
  relation?: never;
}

interface StandardColumnSchema<T = any> extends BaseColumnSchema<T> {
  type?: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'textarea';
  primary?: false;
  readonly?: boolean;
  required?: boolean;
  nullable?: boolean;
  formula?: never;
  options?: never;
  relation?: never;
}

export type ColumnSchema<T = any> =
  | PrimaryColumnSchema<T>
  | DisplayColumnSchema<T>
  | ComputedColumnSchema<T>
  | RelationColumnSchema<T>
  | SelectColumnSchema<T>
  | StandardColumnSchema<T>;

// =========================================================================
// 2. LAYER MODUL SCHEMA (BLUEPRINT FOR FRONTEND RENDERING)
// =========================================================================

export interface Queue<Q = BaseQueueItem> {
  label: string;
  schema: ColumnSchema<Q>[];
  data?: Q[];
}

export interface MenuItem {
  key: string;
  icon: string;
  label: string;
  type: string;
  route: string;
  api: string;
  menuCategory: string;
}

export interface MasterSchema<T = any> {
  icon?: string;
  key: string;
  label: string;
  type: 'master';
  isMenuHidden: boolean;
  permissions: { create: boolean; edit: boolean; delete: boolean;[key: string]: boolean };
  actions?: Array<{ key: string; label: string; type: string }>;
  schema: ColumnSchema<T>[]; // Generic T mengunci kolom ke model Master
  data?: T[];
}

export interface TransactionSchema<H = any, D = any, Q = BaseQueueItem> {
  icon?: string;
  key: string;
  label: string;
  prefix: string;
  type: 'transaction';
  isMenuHidden: boolean;
  permissions: { create: boolean; edit: boolean; delete: boolean;[key: string]: boolean };
  actions?: Array<{ key: string; label: string; type: string }>;
  queue: Queue<Q>;
  header: { label: string; schema: ColumnSchema<H>[]; data?: H | null }; // Generic H mengunci kolom Header
  details: { label: string; schema: ColumnSchema<D>[]; data?: D[] };     // Generic D mengunci kolom Detail
}

// =========================================================================
// 3. LAYER CORE SERVICE (BUSINESS LOGIC CONTRACT)
// =========================================================================

export interface MasterService<T> {
  getModuleSchema(): MasterSchema<T>;
  getAll(filter?: Record<string, any>):any;
  getById(key: string | number):any;
  create(body: Partial<T>):any;
  update(key: string | number, body: Partial<T>):any;
  delete(key: string | number):any;
  searchData(keyword: string):any;
}

export interface TransactionService<H = any, D = any, Q = BaseQueueItem> {
  getModuleSchema(): TransactionSchema<H, D, Q>;
  getAll(): any;
  getQueue(): any;
  getHeader(id: number): any;
  getDetails(headerId: number): any;

  newTransaction(body?: Partial<H>): any;
  getTransaction(id: number): any;
  getLastTransaction(): any;
  cancelTransaction(id: number, body?: any): any;
  saveTransaction(id: number, body?: any): any;
  updateHeader(id: number, body: Partial<H>): any;

  addDetails(headerId: number, body: any): any;
  updateDetails(headerId: number, id: number, body: Partial<D>): any;
  deleteDetails(headerId: number, id: number): any;
}