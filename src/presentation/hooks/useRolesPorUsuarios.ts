import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";

/**
 * Mapa `id_usuario -> nombres de rol` de TODA la plataforma, en una sola
 * consulta. Pensado para el desglose de `/plataforma`: ahí se listan usuarios
 * de muchas empresas, y pedir los roles uno por uno sería N+1 requests.
 *
 * A diferencia de `useRoles` (catálogo de roles) o `useRolesDeUsuario`
 * (roles de un solo usuario), este cubre todos los usuarios de golpe.
 */
export function useRolesPorUsuarios() {
  const container = getContainer();

  return useQuery({
    queryKey: ["roles", "por-usuario"],
    queryFn: () => container.getRolesPorUsuarios.execute(),
    // Los roles cambian muy poco; sirve para no re-fetch en cada render.
    staleTime: 5 * 60 * 1000,
  });
}
