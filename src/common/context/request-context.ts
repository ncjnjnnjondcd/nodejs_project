import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextStore {
  processId: string;
  userId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContextStore>();
