/**
 * Constructor de permisos que sigue la convención de nombres del proyecto.
 *
 * El administrador escribe la palabra del recurso (ej: "proveedores") y
 * marca con checks qué acciones aplican. Cada acción produce un permiso con
 * el prefijo que el resto del sistema ya reconoce:
 *
 *   acceder   -> ver_<recurso>          (menú / ruta)
 *   crear     -> crear_<recurso>        (botón Nuevo)
 *   modificar -> editar_<recurso>       (botón Editar)
 *   autorizar -> autorizar_<recurso>    (botón Aprobar / autorizar)
 *
 * El prefijo es fijo por acción para que un permiso generado acá sea
 * indistinguible de uno sembrado en las migraciones 024/025.
 */

export type AccionPermiso = "acceder" | "crear" | "modificar" | "autorizar";

export const ACCIONES: { accion: AccionPermiso; etiqueta: string; prefijo: string; ayuda: string }[] = [
  { accion: "acceder", etiqueta: "Acceder", prefijo: "ver_", ayuda: "Ver el módulo en el menú y poder entrar a su ruta." },
  { accion: "crear", etiqueta: "Crear", prefijo: "crear_", ayuda: "Habilita el botón de crear registros nuevos." },
  { accion: "modificar", etiqueta: "Modificar", prefijo: "editar_", ayuda: "Habilita el botón de editar registros existentes." },
  { accion: "autorizar", etiqueta: "Autorizar", prefijo: "autorizar_", ayuda: "Habilita acciones de aprobación / autorización." },
];

const PREFIJO_POR_ACCION: Record<AccionPermiso, string> = {
  acceder: "ver_",
  crear: "crear_",
  modificar: "editar_",
  autorizar: "autorizar_",
};

/**
 * Normaliza la palabra del recurso a snake_case: minúsculas, sin acentos, sin
 * espacios ni caracteres raros, y con guiones bajos entre palabras. Devuelve
 * cadena vacía si no queda nada válido.
 */
export function normalizarRecurso(entrada: string): string {
  return entrada
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Nombre completo del permiso para una acción dada (ej: crear_proveedores). */
export function nombrePermisoPara(accion: AccionPermiso, recursoNormalizado: string): string {
  if (!recursoNormalizado) return "";
  return `${PREFIJO_POR_ACCION[accion]}${recursoNormalizado}`;
}

/** El módulo al que pertenece el permiso es la propia palabra del recurso. */
export function moduloParaRecurso(recursoNormalizado: string): string | null {
  return recursoNormalizado || null;
}
