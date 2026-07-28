import { AsyncLocalStorage } from 'async_hooks';
import { CustomJwtPayload } from './jwt'; // Sesuaikan path menuju utils jwt Anda

export const userContextStorage = new AsyncLocalStorage<CustomJwtPayload>();