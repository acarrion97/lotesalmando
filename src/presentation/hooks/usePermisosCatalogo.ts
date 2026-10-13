import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

/** Catálogo completo de permisos (tabla `permiso`), agrupado por módulo en la UI. */
export function usePermisosCatalogo() {
  const container = getContainer();

  return useQuery({
    queryKey: ["permisos", "catalogo"],
    queryFn: () => container.getAllPermisos.execute(),
  });
}
