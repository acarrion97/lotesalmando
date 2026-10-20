/**
 * Permiso del catálogo (`tabla permiso`). El `nombre_permiso` sigue la
 * convención `<acción>_<recurso>` (ver_/crear_/editar_/eliminar_/autorizar_) y
 * es lo que el frontend contrasta para decidir menú, rutas, acciones y alcance
 * de datos. `modulo` agrupa el permiso para mostrarlo en la UI.
 */
export interface Permiso {
  id_permiso: number;
  nombre_permiso: string;
  modulo: string | null;
}
