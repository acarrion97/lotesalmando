import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button, Card, Col, Row, Spin, Tag, Typography, message } from "antd";
import {
  CheckCircleFilled,
  CrownOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useEmpresa } from "@/presentation/providers/EmpresaProvider";
import { useSeleccionarPlan } from "@/presentation/hooks/useSeleccionarPlan";
import { PLANES_PAGO, type PlanId, type PlanPago } from "./planesPago";

const { Text, Title } = Typography;

const PLAN_ICONS: Record<PlanId, React.ReactNode> = {
  basico: <ThunderboltOutlined />,
  inicial: <RocketOutlined />,
  avanzado: <CrownOutlined />,
};

export function SeleccionarPlanPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { empresaActual } = useEmpresa();
  const seleccionarPlan = useSeleccionarPlan();
  const [planAbierto, setPlanAbierto] = useState<PlanId | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // Recien salimos del registro: sin sesion no hay plan que elegir.
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#082B33" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.id_empresa) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#082B33", padding: 24 }}>
        <Card style={{ maxWidth: 420, borderRadius: 16, textAlign: "center" }}>
          <Title level={4}>No encontramos tu empresa</Title>
          <Text type="secondary">Inicia sesion de nuevo para elegir tu plan.</Text>
          <Button type="primary" block style={{ marginTop: 16, background: "#10B981", borderColor: "#10B981" }} onClick={() => navigate("/login")}>
            Ir a iniciar sesion
          </Button>
        </Card>
      </div>
    );
  }

  const planActual = empresaActual?.plan ?? null;

  const elegirPlan = (plan: PlanPago) => {
    setPlanAbierto(plan.id);
    const abrirCheckout = () => window.open(plan.urlCheckout, "_blank", "noopener,noreferrer");

    seleccionarPlan.mutate(
      { idEmpresa: user.id_empresa!, plan: plan.id },
      {
        onSuccess: () => {
          messageApi.success(`Elegiste el ${plan.nombre}. Te llevamos al pago seguro.`);
          abrirCheckout();
        },
        onError: () => {
          // El pago se puede hacer igual: solo fallo guardar la eleccion.
          messageApi.warning("No pudimos guardar tu plan, pero puedes continuar con el pago.");
          abrirCheckout();
        },
        onSettled: () => setPlanAbierto(null),
      }
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#082B33",
        padding: 24,
      }}
    >
      {contextHolder}
      <div style={{ width: "100%", maxWidth: 980 }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo-light.png" alt="Lotes al Mando" style={{ maxHeight: 90, marginBottom: 8 }} />
          <Title level={3} style={{ color: "#fff", marginBottom: 8 }}>
            Elige el plan de tu empresa
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, display: "block" }}>
            Tu cuenta y empresa ya estan creadas. El pago se procesa de forma segura en Hotmart y podras cambiar de plan mas adelante.
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          {PLANES_PAGO.map((plan) => {
            const seleccionado = planActual === plan.id;
            return (
              <Col xs={24} md={8} key={plan.id}>
                <Card
                  style={{
                    borderRadius: 16,
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    borderColor: seleccionado ? "#10B981" : undefined,
                    boxShadow: seleccionado ? "0 8px 24px rgba(16,185,129,0.25)" : undefined,
                  }}
                  styles={{ body: { display: "flex", flexDirection: "column", height: "100%" } }}
                >
                  <div style={{ textAlign: "center", fontSize: 32, color: "#10B981", marginBottom: 8 }}>
                    {PLAN_ICONS[plan.id]}
                  </div>
                  <div style={{ textAlign: "center", marginBottom: 8 }}>
                    <Text strong style={{ fontSize: 18 }}>
                      {plan.nombre}
                    </Text>
                    <div>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {plan.descripcion}
                      </Text>
                    </div>
                  </div>

                  {seleccionado && (
                    <div style={{ textAlign: "center", marginBottom: 12 }}>
                      <Tag icon={<CheckCircleFilled />} color="success">
                        Seleccionado
                      </Tag>
                    </div>
                  )}

                  <div style={{ flex: 1 }} />
                  <Button
                    type="primary"
                    block
                    loading={seleccionarPlan.isPending && planAbierto === plan.id}
                    onClick={() => elegirPlan(plan)}
                    style={{
                      height: 44,
                      fontWeight: 600,
                      fontSize: 15,
                      background: "#10B981",
                      borderColor: "#10B981",
                    }}
                  >
                    {seleccionado ? "Volver al pago" : "Elegir plan"}
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>

        <div style={{ textAlign: "center", marginTop: 24 }}>
          <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, display: "block", marginBottom: 12 }}>
            <SafetyCertificateOutlined /> Pago seguro procesado por Hotmart
          </Text>
          <Button size="large" onClick={() => navigate("/dashboard")}>
            Continuar sin pagar por ahora
          </Button>
        </div>
      </div>
    </div>
  );
}
