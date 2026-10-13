import { usePermiso } from "@/presentation/providers";

/**
 * true si el usuario tiene el permiso de acción indicado. Uso en botones:
 *
 *   const puedeCrear = usePuede("crear_clientes");
 *   {puedeCrear && <Button ...>Nuevo</Button>}
 *
 * Los nombres deben coincidir con `permiso.nombre_permiso` (migración 024).
 */
export function usePuede(permiso: string | null | undefined): boolean {
  const { tienePermiso } = usePermiso();
  return tienePermiso(permiso);
}
