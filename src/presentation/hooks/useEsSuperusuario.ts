import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useAuth } from "@/presentation/providers/AuthProvider";

export function useEsSuperusuario() {
  const { user, isAuthenticated } = useAuth();
  const idUsuario = user?.id_usuario;

  const query = useQuery({
    queryKey: ["roles", "superusuario", idUsuario],
    queryFn: () => {
      if (idUsuario === undefined) {
        throw new Error("No se pudo determinar el usuario de la sesión.");
      }
      return getContainer().getRolesByUsuario.execute(idUsuario);
    },
    enabled: isAuthenticated && idUsuario !== undefined,
    staleTime: 5 * 60 * 1000,
  });

  return {
    esSuperusuario:
      query.data?.some((rol) => rol.nombre_rol.trim().toLocaleLowerCase() === "superusuario") ??
      false,
    isLoading: query.isLoading,
    isError: query.isError,
  };
}
