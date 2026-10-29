import { idbAsyncStorage } from "./idbStorage";
import { isOfflineAuthContext } from "./offlineDataPolicy";
import type { OfflineAuthContext } from "./offlineDataPolicy";

export const OFFLINE_AUTH_CONTEXT_KEY = "lotesalmando-offline-auth-context";

export async function guardarContextoAutenticacionOffline(context: OfflineAuthContext) {
  await idbAsyncStorage.setItem(OFFLINE_AUTH_CONTEXT_KEY, JSON.stringify(context));
}

export async function leerContextoAutenticacionOffline(
  userId: string,
  now: number = Date.now(),
): Promise<OfflineAuthContext | null> {
  const stored = await idbAsyncStorage.getItem(OFFLINE_AUTH_CONTEXT_KEY);
  if (!stored) return null;

  let context: unknown;
  try {
    context = JSON.parse(stored);
  } catch (error) {
    console.error("No se pudo leer el contexto offline de autenticación.", error);
    await borrarContextoAutenticacionOffline();
    return null;
  }

  if (isOfflineAuthContext(context, userId, now)) return context;

  await borrarContextoAutenticacionOffline();
  return null;
}

export async function borrarContextoAutenticacionOffline() {
  await idbAsyncStorage.removeItem(OFFLINE_AUTH_CONTEXT_KEY);
}
