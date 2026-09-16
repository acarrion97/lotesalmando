import { get, set, del } from "idb-keyval";
import type { AsyncStorage } from "@tanstack/query-persist-client-core";

/**
 * Adapts idb-keyval to the AsyncStorage shape TanStack Query's persister
 * expects, so the offline query cache lives in IndexedDB instead of
 * localStorage (more headroom, doesn't block the main thread).
 */
export const idbAsyncStorage: AsyncStorage<string> = {
  getItem: async (key: string) => (await get(key)) ?? null,
  setItem: async (key: string, value: string) => {
    await set(key, value);
  },
  removeItem: async (key: string) => {
    await del(key);
  },
};
