import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useAuth } from "./AuthProvider";
import { permisoParaRuta } from "@/presentation/permisos/permisosConfig";

interface PermisoContextValue {
  /** Nombres de permiso del usuario con sesión. Vacío si no hay sesión. */
  permisos: string[];
  /** Mientras se cargan los permisos, el menú/rutas deben esperar (no mostrar "acceso denegado" falso). */
  cargando: boolean;
  /** true si el usuario tiene el permiso exacto. */
  tienePermiso: (permiso: string | null | undefined) => boolean;
  /** true si el usuario puede ver una ruta (menú y router usan la misma regla). */
  puedeVerRuta: (pathname: string) => boolean;
  /**
   * true si el usuario ve todos los registros de la empresa. Lo da el permiso
   * `ver_registros_de_todos` (Administrador/Gerente). Un Vendedor no lo tiene y
   * por eso solo ve los registros vinculados a su asesor.
   */
  veTodosLosRegistros: boolean;
}

const PermisoContext = createContext<PermisoContextValue | undefined>(undefined);

const QUERY_KEY = ["permisos", "sesion"] as const;

export function PermisoProvider({ children }: { children: ReactNode }) {
  const container = getContainer();
  const { user, isAuthenticated } = useAuth();
  const idUsuario = user?.id_usuario ?? null;

  const { data, isLoading } = useQuery({
    queryKey: [...QUERY_KEY, idUsuario],
    queryFn: () => container.getPermisosByUsuario.execute(idUsuario as number),
    enabled: isAuthenticated && !!idUsuario,
    // Los permisos cambian poco: se cachean por usuario.
    staleTime: 1000 * 60 * 5,
  });

  const permisos = useMemo(() => data ?? [], [data]);

  const permisosSet = useMemo(() => new Set(permisos), [permisos]);

  const value = useMemo<PermisoContextValue>(() => {
    const tienePermiso = (permiso: string | null | undefined): boolean => {
      if (!permiso) return true; // Sin permiso requerido = siempre permitido.
      return permisosSet.has(permiso);
    };

    const puedeVerRuta = (pathname: string): boolean => {
      return tienePermiso(permisoParaRuta(pathname));
    };

    return {
      permisos,
      // Si no hay sesión no hay nada que cargar.
      cargando: isAuthenticated && !!idUsuario && isLoading,
      tienePermiso,
      puedeVerRuta,
      veTodosLosRegistros: permisosSet.has("ver_registros_de_todos"),
    };
  }, [permisos, permisosSet, isAuthenticated, idUsuario, isLoading]);

  return <PermisoContext.Provider value={value}>{children}</PermisoContext.Provider>;
}

export function usePermiso(): PermisoContextValue {
  const context = useContext(PermisoContext);
  if (!context) throw new Error("usePermiso must be used within a PermisoProvider");
  return context;
}
