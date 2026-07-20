export interface Options {
  label: string;
  value: string;
}

// keyof T -> Memberikan auto-complete kolom dari Model Prisma
// (string & {}) -> Tetap fleksibel jika ada kolom kustom/virtual/komputasi
interface BaseColumnSchema<T = any> {
  key: keyof T | (string & {});
  label: string;
  highlight?: boolean;
  validation?: any;
  size?: number;
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

export interface Queue<Q = any> {
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
  permissions: { create: boolean; edit: boolean; delete: boolean; [key: string]: boolean };
  actions?: Array<{ key: string; label: string; type: string }>;
  schema: ColumnSchema<T>[]; // Generic T mengunci kolom ke model Master
  data?: T[];
}

export interface TransactionSchema<H = any, D = any, Q = any> {
  icon?: string;
  key: string;
  label: string;
  prefix: string;
  type: 'transaction';
  isMenuHidden: boolean;
  permissions: { create: boolean; edit: boolean; delete: boolean; [key: string]: boolean };
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
  getAll(filter?: Record<string, any>): Promise<T[]>;
  getById(key: string | number): Promise<T | null>;
  create(body: Partial<T>): Promise<T>;
  update(key: string | number, body: Partial<T>): Promise<T>;
  delete(key: string | number): Promise<boolean>;
}

export interface TransactionService<H, D, Q = any> {
  getModuleSchema(): TransactionSchema<H, D, Q>;
  getQueue(): Promise<Q[]>; 
  getHeader(id: number): Promise<H | null>;
  getDetails(headerId: number): Promise<D[]>;

  newTransaction(body?: Partial<H>): Promise<H>;
  getTransaction(id: number): Promise<{ header: H; details: any[] } | null>;
  getLastTransaction(): Promise<H | null>;
  cancelTransaction(id: number, body?: any): Promise<boolean>; 
  saveTransaction(id: number, body?: any): Promise<H>;
  updateHeader(id: number, body: Partial<H>): Promise<H>;

  addDetails(headerId: number, body: any): Promise<D>; 
  updateDetails(headerId: number, id: number, body: Partial<D>): Promise<D>;
  deleteDetails(headerId: number, id: number): Promise<boolean>;
}