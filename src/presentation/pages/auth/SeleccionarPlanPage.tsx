import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Alert, Button, Card, Col, Row, Spin, Tag, Typography, message } from "antd";
import {
  CheckCircleFilled,
  CrownOutlined,
  DatabaseOutlined,
  MailOutlined,
  RocketOutlined,
  SafetyCertificateOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  UngroupOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useEmpresa } from "@/presentation/providers/EmpresaProvider";
import { useSeleccionarPlan } from "@/presentation/hooks/useSeleccionarPlan";
import { usePlanes } from "@/presentation/hooks";
import { PLANES_FALLBACK } from "./planesPago";
import type { PlanDto } from "@/application/plan/dto/PlanDto";

const { Text, Title } = Typography;

const PLAN_ICONS: Record<string, React.ReactNode> = {
  basico: <ThunderboltOutlined />,
  inicial: <RocketOutlined />,
  avanzado: <CrownOutlined />,
};

/** Icono por tipo de limite (fallback: el de la clave del plan). */
function iconoDePlan(clave: string): React.ReactNode {
  return PLAN_ICONS[clave] ?? <ThunderboltOutlined />;
}

/** Lineas de limites del plan para la tarjeta. Vacio si no tiene limites. */
function limitesDePlan(plan: PlanDto): { icono: React.ReactNode; texto: string }[] {
  const items: { icono: React.ReactNode; texto: string }[] = [];
  if (plan.max_proyectos != null) {
    items.push({
      icono: <UngroupOutlined />,
      texto: plan.max_proyectos === 1 ? "1 proyecto" : `Hasta ${plan.max_proyectos} proyectos`,
    });
  }
  if (plan.max_lotes_por_proyecto != null) {
    items.push({ icono: <DatabaseOutlined />, texto: `Hasta ${plan.max_lotes_por_proyecto} lotes por proyecto` });
  }
  if (plan.max_usuarios != null) {
    items.push({ icono: <TeamOutlined />, texto: `${plan.max_usuarios} usuarios` });
  }
  return items;
}

export function SeleccionarPlanPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { empresaActual } = useEmpresa();
  const { data: planesBD, isLoading: cargandoPlanes } = usePlanes();
  const seleccionarPlan = useSeleccionarPlan();
  const [planAbierto, setPlanAbierto] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // Recien salimos del registro: sin sesion no hay plan que elegir.
  if (loading || cargandoPlanes) {
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

  // Fuente de verdad: tabla `plan` (activos). Fallback: constantes.
  const planesDisponibles = (planesBD ?? []).filter((p) => p.activo);
  const planesAMostrar = planesDisponibles.length > 0 ? planesDisponibles : PLANES_FALLBACK;

  const planActual = empresaActual?.plan ?? null;

  const elegirPlan = (plan: PlanDto) => {
    setPlanAbierto(plan.clave);
    const abrirCheckout = () => {
      if (plan.url_checkout) {
        window.open(plan.url_checkout, "_blank", "noopener,noreferrer");
      } else {
        messageApi.warning("Este plan aun no tiene link de pago configurado. Contactanos para activarlo.");
      }
    };

    seleccionarPlan.mutate(
      { idEmpresa: user.id_empresa!, plan: plan.clave },
      {
        onSuccess: () => {
          messageApi.success(`Elegiste el ${plan.nombre}. Paga con el mismo correo con el que te registraste.`);
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
          <img src="/logo-transparent.png" alt="Lotes al Mando" style={{ maxHeight: 90, marginBottom: 8 }} />
          <Title level={3} style={{ color: "#fff", marginBottom: 8 }}>
            Elige el plan de tu empresa
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, display: "block" }}>
            Tu cuenta y empresa ya estan creadas. El pago se procesa de forma segura en Hotmart y podras cambiar de plan mas adelante.
          </Text>
        </div>

        <Alert
          type="warning"
          showIcon
          icon={<MailOutlined />}
          message="Usa el mismo correo electronico al pagar en Hotmart"
          description="En el checkout de Hotmart ingresa el correo con el que te registraste aqui. Asi vinculamos tu pago a tu empresa automaticamente; si usas otro correo, el pago no se reconoce."
          style={{ marginBottom: 24, borderRadius: 12 }}
        />

        <Row gutter={[16, 16]}>
          {planesAMostrar.map((plan) => {
            const seleccionado = planActual === plan.clave;
            const limites = limitesDePlan(plan);
            return (
              <Col xs={24} md={8} key={plan.clave}>
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
                  <div style={{ textAlign: "center", marginBottom: 8, minHeight: 56 }}>
                    {plan.imagen_url ? (
                      <img
                        src={plan.imagen_url}
                        alt={plan.nombre}
                        style={{ maxHeight: 56, maxWidth: "100%", objectFit: "contain" }}
                      />
                    ) : (
                      <div style={{ fontSize: 32, color: "#10B981" }}>{iconoDePlan(plan.clave)}</div>
                    )}
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

                  {limites.length > 0 && (
                    <div style={{ margin: "0 auto 12px", display: "flex", flexDirection: "column", gap: 4 }}>
                      {limites.map((limite) => (
                        <Text key={limite.texto} style={{ fontSize: 13, color: "rgba(0,0,0,0.65)" }}>
                          {limite.icono} {limite.texto}
                        </Text>
                      ))}
                    </div>
                  )}

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
                    loading={seleccionarPlan.isPending && planAbierto === plan.clave}
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
