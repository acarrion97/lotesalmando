import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import type { UsuarioDto } from "@/application/usuarios/dto/UsuarioDto";

/**
 * Todos los usuarios de la plataforma, sin filtrar por empresa.
 *
 * A diferencia de `useUsuarios` (que acota a la empresa de la sesión), este
 * hook es transversal y solo lo debe consumir la vista de superadmin en
 * `/plataforma`, que ya está tras el permiso `ver_plataforma`.
 */
export function useUsuariosPlataforma() {
  const container = getContainer();

  return useQuery<UsuarioDto[]>({
    queryKey: ["usuarios", "plataforma"],
    queryFn: () => container.getUsuarios.execute(),
  });
}
