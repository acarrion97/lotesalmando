import { Navigate, useLocation } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { usePermiso } from "@/presentation/providers/PermisoProvider";

/**
 * Protege una ruta: exige sesión activa y, si se pasa `permiso`, el permiso
 * correspondiente. Mientras cargan la sesión o los permisos muestra un spinner
 * (para no redirigir a "acceso denegado" de forma falsa). Si falta el permiso,
 * redirige al dashboard —la primera ruta que el usuario sí puede ver— en vez
 * de dejar una pantalla en blanco.
 */
export function ProtectedRoute({
  children,
  permiso,
}: {
  children: React.ReactNode;
  /** Permiso requerido para ver la ruta; null/undefined = solo requiere sesión. */
  permiso?: string | null;
}) {
  const { isAuthenticated, loading } = useAuth();
  const { cargando, tienePermiso } = usePermiso();
  const location = useLocation();

  if (loading || cargando) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "10vh" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (permiso && !tienePermiso(permiso)) {
    // Sin permiso: volver al dashboard (la ruta base autenticada).
    return <Navigate to="/dashboard" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
