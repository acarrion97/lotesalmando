import {
  isOfflineAuthContext,
  isMapQueryFresh,
  isOfflineMapSelection,
  isOfflineMapQueryKey,
  MAP_OFFLINE_CACHE_TTL_MS,
} from "../src/infrastructure/offline/offlineDataPolicy.ts";

let verificaciones = 0;
function comprobar(condicion: boolean, descripcion: string) {
  verificaciones++;
  if (!condicion) {
    console.error(`  ERROR ${descripcion}`);
    process.exitCode = 1;
    return;
  }
  console.log(`  ok   ${descripcion}`);
}

console.log("Claves admitidas para persistencia de mapas");
comprobar(isOfflineMapQueryKey(["mapa-publico", "ciudadela-san-lucas"]), "mapa público por slug");
comprobar(isOfflineMapQueryKey(["mapa", 12, 34]), "plano interno por empresa y proyecto");
comprobar(isOfflineMapQueryKey(["mapa", 12, 34, "lotes"]), "lotes del plano por empresa y proyecto");
comprobar(
  isOfflineMapQueryKey(["mapa", 12, 34, "lotes-manzana", 56]),
  "lotes de la manzana del mapa por empresa, proyecto y manzana",
);
comprobar(isOfflineMapQueryKey(["empresas", 12]), "contexto de una empresa");
comprobar(isOfflineMapQueryKey(["permiso-mapa", 12, 56]), "permiso de lectura de mapas por usuario");
comprobar(!isOfflineMapQueryKey(["mapa-publico", ""]), "rechaza slug vacío");
comprobar(!isOfflineMapQueryKey(["mapa-publico", "slug", 12]), "rechaza clave pública no exacta");
comprobar(!isOfflineMapQueryKey(["mapa", 0, 34]), "rechaza empresa inválida");
comprobar(!isOfflineMapQueryKey(["mapa", 12, 0]), "rechaza proyecto inválido");
comprobar(
  !isOfflineMapQueryKey(["mapa", 12, 34, "lotes-manzana", 0]),
  "rechaza manzana inválida en consulta de mapa",
);
comprobar(!isOfflineMapQueryKey(["empresas"]), "rechaza contexto de empresa sin alcance");
comprobar(!isOfflineMapQueryKey(["permiso-mapa", 12, 0]), "rechaza permiso sin usuario válido");
comprobar(!isOfflineMapQueryKey(["permisos", "sesion", 56]), "no persiste permisos generales");

console.log("Caducidad de los datos del mapa");
const ahora = 1_800_000_000_000;
comprobar(MAP_OFFLINE_CACHE_TTL_MS === 60 * 60 * 1000, "la retención configurada es una hora");
comprobar(isMapQueryFresh(ahora - MAP_OFFLINE_CACHE_TTL_MS + 1, ahora), "acepta datos anteriores a una hora");
comprobar(!isMapQueryFresh(ahora - MAP_OFFLINE_CACHE_TTL_MS, ahora), "expira datos al cumplir una hora");
comprobar(!isMapQueryFresh(ahora + 1, ahora), "rechaza marcas de tiempo futuras");

console.log("Contexto offline de autenticación mínimo");
const contexto = {
  userId: "auth-user-1",
  email: "mapa@example.test",
  nombres: "Usuario de prueba",
  idUsuario: 56,
  idEmpresa: 12,
  estadoPago: "pagado",
  tieneRoles: true,
  savedAt: ahora - 1000,
};
comprobar(isOfflineAuthContext(contexto, "auth-user-1", ahora), "acepta contexto reciente del mismo usuario");
comprobar(!isOfflineAuthContext(contexto, "auth-user-2", ahora), "no comparte contexto entre usuarios");
comprobar(
  !isOfflineAuthContext({ ...contexto, savedAt: ahora - MAP_OFFLINE_CACHE_TTL_MS }, "auth-user-1", ahora),
  "expira contexto de autenticación al cumplir una hora",
);
comprobar(
  !isOfflineAuthContext({ ...contexto, idEmpresa: 0 }, "auth-user-1", ahora),
  "rechaza contexto sin empresa",
);

console.log("Selección del último mapa interno");
const seleccion = {
  userId: "auth-user-1",
  empresaId: 12,
  proyectoId: 34,
  etapaId: 45,
  manzanaId: 56,
  savedAt: ahora - 1000,
};
comprobar(
  isOfflineMapSelection(seleccion, "auth-user-1", 12, ahora),
  "restaura la selección reciente del mismo usuario y empresa",
);
comprobar(!isOfflineMapSelection(seleccion, "auth-user-2", 12, ahora), "no comparte selección entre usuarios");
comprobar(!isOfflineMapSelection(seleccion, "auth-user-1", 13, ahora), "no comparte selección entre empresas");
comprobar(
  !isOfflineMapSelection({ ...seleccion, savedAt: ahora - MAP_OFFLINE_CACHE_TTL_MS }, "auth-user-1", 12, ahora),
  "expira la selección al cumplir una hora",
);
comprobar(
  !isOfflineMapSelection({ ...seleccion, proyectoId: 0 }, "auth-user-1", 12, ahora),
  "rechaza selección sin proyecto válido",
);
comprobar(
  !isOfflineMapSelection({ ...seleccion, empresaId: 0 }, "auth-user-1", 0, ahora),
  "rechaza selección sin empresa válida",
);
comprobar(!isOfflineMapSelection(seleccion, "", 12, ahora), "rechaza selección sin usuario válido");
comprobar(
  !isOfflineMapSelection({ ...seleccion, password: "no persistir" }, "auth-user-1", 12, ahora),
  "rechaza campos ajenos a la selección de mapa",
);

console.log(`${verificaciones} verificaciones`);
