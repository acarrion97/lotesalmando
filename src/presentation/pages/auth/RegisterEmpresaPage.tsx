import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Alert, Button, Form, Input, Spin, Tag, Typography, message } from "antd";
import {
  BankOutlined,
  CheckCircleFilled,
  EyeInvisibleOutlined,
  EyeTwoTone,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  TagsOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { registroEmpresaSchema } from "@/presentation/validations";
import { usePlanes } from "@/presentation/hooks";
import { useSeleccionarPlan } from "@/presentation/hooks/useSeleccionarPlan";
import { planesUnicos, iconoDePlan, limitesDePlan, precioFormateado } from "./planInfo";

const { Text, Title } = Typography;

/**
 * Tipo de alta que se esta haciendo. Sale del path de la ruta:
 *   /registro/empresa -> empresa (alta + eleccion de plan en /registro/planes)
 *   /registro/agente  -> agente  (alta + pago directo del plan de agentes)
 * Ambos aceptan el codigo de partnership como query param: ?codigo=XXXX
 */
export type TipoRegistro = "empresa" | "agente";

interface Props {
  tipo?: TipoRegistro;
}

export function RegisterEmpresaPage({ tipo = "empresa" }: Props) {
  const esAgente = tipo === "agente";
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [searchParams] = useSearchParams();
  const { registerNuevaEmpresa } = useAuth();
  const seleccionarPlan = useSeleccionarPlan();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  // Link compartible por un partner: /registro/empresa?codigo=XXX o
  // /registro/agente?codigo=XXX. El codigo viene de la URL y precarga el
  // campo (se puede borrar o corregir antes de enviar).
  const codigoDeUrl = (searchParams.get("codigo") ?? "").trim().toUpperCase();

  // Catalogo de planes: en el registro de agente se muestran los planes
  // "unicos" (plan.es_unico = true) como tarjetas con nombre, precio,
  // descripcion y limites, igual que lo que se ve en /planes.
  const { data: planes, isLoading: cargandoPlanes } = usePlanes();
  const [planElegido, setPlanElegido] = useState<string | null>(null);
  const planesDelRegistro = esAgente ? planesUnicos(planes) : [];
  const planActual =
    planesDelRegistro.find((p) => p.clave === planElegido) ?? planesDelRegistro[0] ?? null;
  const planesSinConfigurar = esAgente && !cargandoPlanes && planesDelRegistro.length === 0;

  useEffect(() => {
    if (!codigoDeUrl) return;
    const actual = form.getFieldValue("codigo_partner");
    if (!actual) form.setFieldValue("codigo_partner", codigoDeUrl);
  }, [codigoDeUrl, form]);

  const irALaSiguientePaso = () => {
    setTimeout(() => navigate("/registro/planes"), 500);
  };

  const onFinish = async (values: {
    email: string;
    password: string;
    nombres: string;
    razon_social: string;
    codigo_partner?: string;
  }) => {
    setLoading(true);
    setError(null);

    const parsed = registroEmpresaSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos invalidos");
      setLoading(false);
      return;
    }

    // Si el campo quedo vacio pero el link traia codigo, se usa el de la URL.
    const codigoPartner = (values.codigo_partner ?? codigoDeUrl).trim();

    const result = await registerNuevaEmpresa(
      parsed.data.email,
      parsed.data.password,
      parsed.data.nombres,
      parsed.data.razon_social,
      codigoPartner,
    );

    if (!result.success) {
      setError(result.error || "Error al crear la cuenta");
      setLoading(false);
      return;
    }

    // Alta de agente: el plan elegido queda guardado en la empresa y se abre
    // directo el enlace de pago de Hotmart (no hay paso de eleccion).
    if (esAgente && planActual && planActual.url_checkout && result.idEmpresa) {
      // La eleccion del plan es solo para que el webhook y el panel la
      // sepan: si falla, el pago se puede hacer igual.
      seleccionarPlan.mutate(
        { idEmpresa: result.idEmpresa, plan: planActual.clave },
        { onError: () => undefined },
      );
      window.open(planActual.url_checkout, "_blank", "noopener,noreferrer");
      // El agente NO pasa por /registro/planes: el pago va directo, asi que
      // esta pestana queda en /login esperando que el webhook confirme.
      navigate("/login", {
        state: {
          avisoPago: `Cuenta creada. Completa el pago del ${planActual.nombre} en Hotmart con este mismo correo y vuelve aqui para iniciar sesion.`,
        },
      });
      return;
    }

    if (esAgente && planActual && !planActual.url_checkout) {
      messageApi.warning(
        `El ${planActual.nombre} aun no tiene link de pago configurado. Elige tu plan en el siguiente paso.`,
      );
      irALaSiguientePaso();
      return;
    }

    messageApi.success(
      esAgente ? "Cuenta creada correctamente" : "Empresa y cuenta creadas correctamente",
    );
    irALaSiguientePaso();
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
      <div
        style={{
          width: "100%",
          maxWidth: esAgente ? 900 : 420,
          display: "flex",
          flexWrap: "wrap",
          gap: 24,
          justifyContent: "center",
          alignItems: "flex-start",
        }}
      >
        {/* Tarjetas de los planes unicos (es_unico): solo en /registro/agente */}
        {esAgente && cargandoPlanes && (
          <div
            style={{
              width: 340,
              maxWidth: "100%",
              background: "#fff",
              borderRadius: 16,
              padding: 40,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Spin size="large" />
          </div>
        )}

        {planesDelRegistro.map((plan) => {
          const seleccionado = planActual?.clave === plan.clave;
          const limites = limitesDePlan(plan);
          return (
            <div
              key={plan.clave}
              onClick={() => setPlanElegido(plan.clave)}
              style={{
                width: 340,
                maxWidth: "100%",
                background: "#fff",
                borderRadius: 16,
                padding: "36px 32px",
                boxShadow: seleccionado
                  ? "0 8px 24px rgba(16,185,129,0.25)"
                  : "0 20px 60px rgba(0,0,0,0.3)",
                border: seleccionado ? "2px solid #10B981" : "1px solid #e6e8eb",
                cursor: planesDelRegistro.length > 1 ? "pointer" : "default",
              }}
            >
              <div style={{ textAlign: "center", marginBottom: 8, minHeight: 48 }}>
                {plan.imagen_url ? (
                  <img
                    src={plan.imagen_url}
                    alt={plan.nombre}
                    style={{ maxHeight: 48, maxWidth: "100%", objectFit: "contain" }}
                  />
                ) : (
                  <div style={{ fontSize: 30, color: "#10B981" }}>{iconoDePlan(plan.clave)}</div>
                )}
              </div>

              <div style={{ textAlign: "center", marginBottom: 12 }}>
                <Title level={4} style={{ marginBottom: 4 }}>
                  {plan.nombre}
                </Title>
                {plan.descripcion && (
                  <Text type="secondary" style={{ fontSize: 13 }}>
                    {plan.descripcion}
                  </Text>
                )}
              </div>

              {plan.precio != null && (
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                  <Text strong style={{ fontSize: 30, lineHeight: 1.2 }}>
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
                    <Text key={limite.texto} style={{ fontSize: 13, color: "rgba(0,0,0,0.55)" }}>
                      {limite.icono} {limite.texto}
                    </Text>
                  ))}
                </div>
              )}

              {planesDelRegistro.length > 1 && (
                <div style={{ textAlign: "center", marginBottom: 8, minHeight: 24 }}>
                  {seleccionado && (
                    <Tag icon={<CheckCircleFilled />} color="success">
                      Elegido para pagar
                    </Tag>
                  )}
                </div>
              )}

              <Text type="secondary" style={{ fontSize: 12, display: "block", textAlign: "center" }}>
                <SafetyCertificateOutlined /> Pagas en Hotmart al terminar el registro. Usa el mismo
                correo con el que te registraste.
              </Text>
            </div>
          );
        })}

        {/* Formulario de alta */}
        <div
          style={{
            width: "100%",
            maxWidth: 420,
            background: "#fff",
            borderRadius: 16,
            padding: "48px 40px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <img
              src="/logo-light.png"
              alt="Lotes al Mando"
              style={{ maxHeight: 90, marginBottom: 8 }}
            />
            <Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 8 }}>
              {esAgente
                ? "Crea tu cuenta de agente y publica tus lotes al instante"
                : "Crea tu empresa para empezar a usar Lotes al Mando"}
            </Text>
          </div>

          {error && (
            <Alert
              title={error}
              type="error"
              showIcon
              closable
              onClose={() => setError(null)}
              style={{ marginBottom: 24 }}
            />
          )}

          {planesSinConfigurar && (
            <Alert
              type="warning"
              showIcon
              title="Sin planes de registro directo"
              description="Todavia no hay ningun plan marcado como unico. Puedes continuar con tu registro y elegir tu plan en el siguiente paso."
              closable
              style={{ marginBottom: 24 }}
            />
          )}

          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="razon_social"
              rules={[{ required: true, message: esAgente ? "Ingresa el nombre de tu agencia" : "Ingresa el nombre de tu empresa" }]}
            >
              <Input
                prefix={<BankOutlined style={{ color: "#bfbfbf" }} />}
                placeholder={esAgente ? "Nombre de tu agencia o inmobiliaria" : "Nombre de tu empresa"}
              />
            </Form.Item>

            <Form.Item
              name="nombres"
              rules={[{ required: true, message: "Ingresa tu nombre completo" }]}
            >
              <Input
                prefix={<UserOutlined style={{ color: "#bfbfbf" }} />}
                placeholder="Tu nombre completo"
              />
            </Form.Item>

            <Form.Item
              name="email"
              extra="Usa este mismo correo al pagar en Hotmart, asi asociamos el pago a tu cuenta."
              rules={[
                { required: true, message: "Ingresa tu correo electronico" },
                { type: "email", message: "Correo electronico invalido" },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: "#bfbfbf" }} />}
                placeholder="Correo electronico"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: "Ingresa tu contrasena" },
                { min: 6, message: "Minimo 6 caracteres" },
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
                placeholder="Contrasena"
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
            </Form.Item>

            <Form.Item
              name="codigo_partner"
              tooltip="Si un partner (vendedor de la plataforma) te compartio su codigo, ingresalo aqui. Es opcional."
            >
              <Input
                prefix={<TagsOutlined style={{ color: "#bfbfbf" }} />}
                placeholder="Codigo de partner (opcional)"
                allowClear
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: 16 }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
                style={{
                  height: 44,
                  fontWeight: 600,
                  fontSize: 15,
                  background: "#10B981",
                  borderColor: "#10B981",
                }}
              >
                {esAgente && planActual?.url_checkout
                  ? "Crear cuenta y pagar"
                  : esAgente
                    ? "Crear Cuenta"
                    : "Crear Empresa y Cuenta"}
              </Button>
            </Form.Item>
          </Form>
          <div style={{ textAlign: "center", marginTop: 8 }}>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {esAgente && <TeamOutlined />} Ya tienes cuenta?{" "}
              <Link to="/login">Inicia sesion</Link>
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
