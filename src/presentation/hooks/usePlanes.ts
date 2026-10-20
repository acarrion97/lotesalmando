import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

/**
 * Catalogo global de planes (tabla `plan`). No esta scoping por empresa:
 * es configuracion de la plataforma, visible tambien en el registro.
 * Filtra los inactivos quien los consume (el admin los ve todos).
 */
export function usePlanes() {
  return useQuery({
    queryKey: ["planes"],
    queryFn: () => getContainer().getPlanes.execute(),
    // Catalogo que cambia poco; tambien lo usa el registro publico.
    staleTime: 1000 * 60 * 5,
  });
}
