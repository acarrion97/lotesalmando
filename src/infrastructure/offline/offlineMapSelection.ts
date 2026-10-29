import { idbAsyncStorage } from "./idbStorage";
import { isOfflineMapSelection, type OfflineMapSelection } from "./offlineDataPolicy";

export const OFFLINE_MAP_SELECTION_KEY = "lotesalmando-offline-map-selection";

let version = 0;
let escriturasPendientes: Promise<void> = Promise.resolve();

function encolarEscritura(operacion: () => Promise<void>) {
  const escritura = escriturasPendientes.then(operacion);
  escriturasPendientes = escritura.catch(() => undefined);
  return escritura;
}

export async function leerSeleccionMapaOffline(
  userId: string,
  empresaId: number,
  now: number = Date.now(),
): Promise<OfflineMapSelection | null> {
  await escriturasPendientes;
  const stored = await idbAsyncStorage.getItem(OFFLINE_MAP_SELECTION_KEY);
  if (!stored) return null;

  let selection: unknown;
  try {
    selection = JSON.parse(stored);
  } catch (error) {
    console.error("No se pudo leer la selección offline del mapa.", error);
    await borrarSeleccionMapaOffline();
    return null;
  }

  if (isOfflineMapSelection(selection, userId, empresaId, now)) return selection;

  await borrarSeleccionMapaOffline();
  return null;
}

export async function guardarSeleccionMapaOffline(selection: OfflineMapSelection) {
  if (!isOfflineMapSelection(selection, selection.userId, selection.empresaId)) {
    throw new Error("No se puede guardar una selección offline de mapa inválida o vencida.");
  }

  const versionDeEscritura = version;
  return encolarEscritura(async () => {
    if (versionDeEscritura !== version) return;
    await idbAsyncStorage.setItem(OFFLINE_MAP_SELECTION_KEY, JSON.stringify(selection));
  });
}

export function borrarSeleccionMapaOffline() {
  version++;
  return encolarEscritura(async () => {
    await idbAsyncStorage.removeItem(OFFLINE_MAP_SELECTION_KEY);
  });
}
