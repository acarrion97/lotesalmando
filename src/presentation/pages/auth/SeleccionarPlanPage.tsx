import { useEffect, useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Alert, Button, Card, Col, Row, Spin, Tag, Typography, message, theme } from "antd";
import { CheckCircleFilled, MailOutlined, SafetyCertificateOutlined } from "@ant-design/icons";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { useEmpresa } from "@/presentation/providers/EmpresaProvider";
import { useSeleccionarPlan } from "@/presentation/hooks/useSeleccionarPlan";
import { usePlanes } from "@/presentation/hooks";
import { PLANES_FALLBACK } from "./planesPago";
import { iconoDePlan, limitesDePlan, precioFormateado } from "./planInfo";import type { PlanDto } from "@/application/plan/dto/PlanDto";

const { Text, Title } = Typography;

export function SeleccionarPlanPage() {
  const navigate = useNavigate();
  const { user, loading, tieneRoles, refrescarEstadoPago } = useAuth();
  const { empresaActual } = useEmpresa();
  const { data: planesBD, isLoading: cargandoPlanes } = usePlanes();
  const seleccionarPlan = useSeleccionarPlan();
  const [planAbierto, setPlanAbierto] = useState<string | null>(null);
  const [verificandoPago, setVerificandoPago] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { token } = theme.useToken();

  // El pago se confirma por webhook (por fuera de la app). Mientras el
  // usuario esta en esta pagina, se re-consulta el estado_pago: el checkout
  // de Hotmart se abre en otra pestana, asi que al volver (focus) o al
  // montar se checa de nuevo. Si cambio a 'pagado' y hay roles, se manda a
  // /login para que inicie sesion ya con el pago registrado.
  const estadoPago = user?.estadoPago;
  useEffect(() => {
    if (!user?.id_empresa) return;
    if (estadoPago === "pagado") return;

    const verificar = async () => {
      setVerificandoPago(true);
      try {
        const pago = await refrescarEstadoPago();
        if (pago === "pagado") {
          // Sin roles el login re-botaria a esta misma pagina (bucle), asi
          // que solo se navega cuando ya puede entrar de verdad.
          if (tieneRoles) {
            navigate("/login", {
              state: { avisoPago: "Pago confirmado. Inicia sesion para entrar." },
            });
          }
        }
      } finally {
        setVerificandoPago(false);
      }
    };

    const alVolver = () => {
      if (document.visibilityState === "visible") void verificar();
    };

    // Revisar apenas entra y cada vez que la pestana vuelve a ser visible.
    void verificar();
    window.addEventListener("focus", alVolver);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener("focus", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [user?.id_empresa, estadoPago, tieneRoles, refrescarEstadoPago, navigate]);

  // Recien salimos del registro: sin sesion no hay plan que elegir.
  if (loading || cargandoPlanes) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#082B33",
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!user.id_empresa) {
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
        <Card style={{ maxWidth: 420, borderRadius: 16, textAlign: "center" }}>
          <Title level={4}>No encontramos tu empresa</Title>
          <Text type="secondary">Inicia sesion de nuevo para elegir tu plan.</Text>
          <Button
            type="primary"
            block
            style={{ marginTop: 16, background: "#10B981", borderColor: "#10B981" }}
            onClick={() => navigate("/login")}
          >
            Ir a iniciar sesion
          </Button>
        </Card>
      </div>
    );
  }

  // Fuente de verdad: tabla `plan` (activos). Fallback: constantes.
  // Los planes "unicos" (es_unico) no se listan aca: se venden por su
  // pagina propia /registro/<clave> con pago directo.
  const planesDisponibles = (planesBD ?? []).filter((p) => p.activo && !p.es_unico);
  const planesAMostrar = planesDisponibles.length > 0 ? planesDisponibles : PLANES_FALLBACK;

  const planActual = empresaActual?.plan ?? null;

  const elegirPlan = (plan: PlanDto) => {
    setPlanAbierto(plan.clave);
    const abrirCheckout = () => {
      if (plan.url_checkout) {
        window.open(plan.url_checkout, "_blank", "noopener,noreferrer");
      } else {
        messageApi.warning(
          "Este plan aun no tiene link de pago configurado. Contactanos para activarlo.",
        );
      }
    };

    seleccionarPlan.mutate(
      { idEmpresa: user.id_empresa!, plan: plan.clave },
      {
        onSuccess: () => {
          messageApi.success(
            `Elegiste el ${plan.nombre}. Paga con el mismo correo con el que te registraste.`,
          );
          abrirCheckout();
        },
        onError: () => {
          // El pago se puede hacer igual: solo fallo guardar la eleccion.
          messageApi.warning("No pudimos guardar tu plan, pero puedes continuar con el pago.");
          abrirCheckout();
        },
        onSettled: () => setPlanAbierto(null),
      },
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
          <img
            src="/logo-transparent.png"
            alt="Lotes al Mando"
            style={{ maxHeight: 90, marginBottom: 8 }}
          />
          <Title level={3} style={{ color: "#fff", marginBottom: 8 }}>
            Elige el plan de tu empresa
          </Title>
          <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 14, display: "block" }}>
            Tu cuenta y empresa ya estan creadas. El pago se procesa de forma segura en Hotmart y
            podras cambiar de plan mas adelante.
          </Text>
        </div>

        <Alert
          type="warning"
          showIcon
          icon={<MailOutlined style={{ color: token.colorWarning }} />}
          title={
            <span style={{ color: token.colorText, fontWeight: 600 }}>
              Usa el mismo correo electronico al pagar en Hotmart
            </span>
          }
          description={
            <span style={{ color: token.colorTextSecondary }}>
              En el checkout de Hotmart ingresa el correo con el que te registraste aqui. Asi
              vinculamos tu pago a tu empresa automaticamente; si usas otro correo, el pago no se
              reconoce.
            </span>
          }
          style={{
            marginBottom: 24,
            borderRadius: 12,
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorderSecondary}`,
          }}
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
                      <div style={{ fontSize: 32, color: "#10B981" }}>
                        {iconoDePlan(plan.clave)}
                      </div>
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

                  {plan.precio != null && (
                    <div style={{ textAlign: "center", marginBottom: 12 }}>
                      <Text strong style={{ fontSize: 30, color: token.colorText, lineHeight: 1.2 }}>
                        {precioFormateado(plan.precio)}
                      </Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          por mes
                        </Text>
                      </div>
                    </div>
                  )}

                  {limites.length > 0 && (
                    <div
                      style={{
                        margin: "0 auto 12px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                      }}
                    >
                      {limites.map((limite) => (
                        <Text
                          key={limite.texto}
                          style={{ fontSize: 13, color: token.colorTextSecondary }}
                        >
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
          <Text
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: 13,
              display: "block",
            }}
          >
            <SafetyCertificateOutlined /> Pago seguro procesado por Hotmart
          </Text>
          {verificandoPago && (
            <Text
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: 13,
                display: "block",
                marginTop: 8,
              }}
            >
              <Spin size="small" /> Verificando tu pago...
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
