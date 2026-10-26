import { Navigate } from "react-router-dom";
import { Alert, Spin } from "antd";
import { SuscripcionPlan } from "@/presentation/components/suscriptionPlan/SuscripcionPlan";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { useEsSuperusuario } from "@/presentation/hooks";
import { useEmpresa } from "@/presentation/providers";

export function SuscripcionPage() {
  const { empresaActual } = useEmpresa();
  const superusuario = useEsSuperusuario();

  if (superusuario.isLoading) {
    return <Spin />;
  }

  if (superusuario.isError) {
    return (
      <Alert
        type="error"
        showIcon
        message="No se pudo verificar el acceso a esta sección."
      />
    );
  }

  if (superusuario.esSuperusuario) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div>
      <PageToolbar
        title="Suscripción"
        subtitle={
          empresaActual
            ? `Plan y consumo de recursos de ${empresaActual.razon_social}`
            : "Administra el plan de tu empresa"
        }
      />
      <SuscripcionPlan />
    </div>
  );
}
