import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  Space,
  Spin,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FileProtectOutlined,
  MailOutlined,
  PhoneOutlined,
  SendOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { DOCUMENTOS_REQUERIDOS } from "@/domain/portalProspecto/entities";
import { usePortalProspecto } from "@/presentation/hooks";
import {
  UploadDocumentoProspecto,
  type EnvioDocumentoProspecto,
} from "@/presentation/components/publicos/UploadDocumentoProspecto";
import {
  portalProspectoAltaSchema,
  portalProspectoConsultaSchema,
} from "@/presentation/validations";

const { Title, Text, Paragraph } = Typography;

const ESTADO_DOCUMENTO: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  pendiente: { color: "blue", label: "En revisión", icon: <ClockCircleOutlined /> },
  aprobado: { color: "green", label: "Aprobado", icon: <CheckCircleOutlined /> },
  rechazado: { color: "red", label: "Rechazado", icon: <CloseCircleOutlined /> },
};

/**
 * Portal del prospecto (público, sin sesión): entra con su email, ve la
 * checklist de documentación legal para la venta de un lote y envía cada
 * archivo. Si el email todavía no existe en el CRM, deja nombres y
 * teléfono mínimos para darse de alta.
 */
export function PortalProspectoPage() {
  const { slug = "" } = useParams();
  const { emailConsultado, buscar, reiniciar, consulta, iniciar, enviar } =
    usePortalProspecto(slug);

  const [emailInput, setEmailInput] = useState("");
  const [errorEmail, setErrorEmail] = useState<string | null>(null);
  const [nombres, setNombres] = useState("");
  const [telefono, setTelefono] = useState("");
  const [errorAlta, setErrorAlta] = useState<string | null>(null);
  const [documento, setDocumento] = useState<EnvioDocumentoProspecto | null>(null);

  const consultar = () => {
    const resultado = portalProspectoConsultaSchema.safeParse({ email: emailInput });
    if (!resultado.success) {
      setErrorEmail(resultado.error.issues[0]?.message ?? "Correo electrónico inválido");
      return;
    }
    setErrorEmail(null);
    buscar(resultado.data.email);
  };

  const registrar = () => {
    const resultado = portalProspectoAltaSchema.safeParse({
      email: emailConsultado,
      nombres,
      telefono,
    });
    if (!resultado.success) {
      setErrorAlta(resultado.error.issues[0]?.message ?? "Revisá los datos");
      return;
    }
    setErrorAlta(null);
    iniciar.mutate(resultado.data, {
      onSuccess: (r) => {
        if (r.ok) {
          void consulta.refetch();
        } else {
          setErrorAlta(r.error ?? "No se pudo registrar");
        }
      },
    });
  };

  const datos = consulta.data;
  const prospecto = datos?.prospecto ?? null;
  const documentos = datos?.documentos ?? [];

  const cambiarEmail = () => {
    reiniciar();
    setEmailInput("");
    setNombres("");
    setTelefono("");
    setErrorEmail(null);
    setErrorAlta(null);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f9", padding: "32px 16px" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            <FileProtectOutlined /> Lotes al Mando
          </Title>
          <Text type="secondary">
            Enviá tu documentación para concretar la compra de tu lote
          </Text>
        </div>

        {!emailConsultado && (
          <Card style={{ borderRadius: 12 }}>
            <Space.Compact style={{ width: "100%" }}>
              <Input
                size="large"
                prefix={<MailOutlined />}
                placeholder="Escribí tu email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                onPressEnter={consultar}
              />
              <Button
                type="primary"
                size="large"
                loading={consulta.isFetching}
                onClick={consultar}
                style={{ minWidth: 130 }}
              >
                Continuar
              </Button>
            </Space.Compact>
            {errorEmail && (
              <Alert
                type="error"
                showIcon
                message={errorEmail}
                style={{ marginTop: 12 }}
              />
            )}
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
              Solo necesitás el email con el que estás en contacto. No hace falta crear cuenta.
            </Text>
          </Card>
        )}

        {emailConsultado && consulta.isFetching && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" />
          </div>
        )}

        {emailConsultado && !consulta.isFetching && datos && !datos.ok && (
          <div style={{ marginTop: 24 }}>
            <Alert
              type="error"
              showIcon
              message={datos.error ?? "No se pudo consultar tu documentación"}
            />
            <Button style={{ marginTop: 12 }} onClick={cambiarEmail}>
              Volver al inicio
            </Button>
          </div>
        )}

        {emailConsultado && !consulta.isFetching && consulta.isError && (
          <div style={{ marginTop: 24 }}>
            <Alert
              type="error"
              showIcon
              message="No se pudo consultar. Probá de nuevo en unos segundos."
            />
            <Button style={{ marginTop: 12 }} onClick={cambiarEmail}>
              Volver al inicio
            </Button>
          </div>
        )}

        {emailConsultado && !consulta.isFetching && datos?.ok && !prospecto && (
          <Card style={{ borderRadius: 12, marginTop: 24 }} title="Creá tu registro para continuar">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`Todavía no te encontramos con el email ${emailConsultado}`}
              description="Dejanos tus nombres y teléfono para registrar tu solicitud de documentación."
            />
            <Form layout="vertical">
              <Form.Item label="Email" required>
                <Input value={emailConsultado} disabled prefix={<MailOutlined />} />
              </Form.Item>
              <Form.Item label="Nombres y apellidos" required>
                <Input
                  prefix={<UserOutlined />}
                  value={nombres}
                  onChange={(e) => setNombres(e.target.value)}
                  placeholder="Por ejemplo: María Pérez"
                />
              </Form.Item>
              <Form.Item label="Teléfono" required>
                <Input
                  prefix={<PhoneOutlined />}
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Por ejemplo: 099123456"
                />
              </Form.Item>
            </Form>
            {errorAlta && (
              <Alert type="error" showIcon message={errorAlta} style={{ marginBottom: 12 }} />
            )}
            <Space wrap>
              <Button
                type="primary"
                icon={<SendOutlined />}
                loading={iniciar.isPending}
                onClick={registrar}
              >
                Registrarme
              </Button>
              <Button onClick={cambiarEmail}>Usar otro email</Button>
            </Space>
          </Card>
        )}

        {emailConsultado && !consulta.isFetching && datos?.ok && prospecto && (
          <div style={{ marginTop: 24 }}>
            <Card style={{ borderRadius: 12, marginBottom: 16 }}>
              <Space direction="vertical" size={4}>
                <Title level={5} style={{ margin: 0 }}>
                  Hola, {prospecto.nombres}
                </Title>
                <Text type="secondary">
                  Completá los documentos que faltan. Cada archivo se revisa y acá ves el estado.
                </Text>
              </Space>
            </Card>

            <Card style={{ borderRadius: 12, marginBottom: 16 }}>
              {DOCUMENTOS_REQUERIDOS.map((requerido) => {
                const enviado = documentos.find((d) => d.tipo === requerido.tipo);
                const info = enviado
                  ? (ESTADO_DOCUMENTO[enviado.estado] ?? {
                      color: "default",
                      label: enviado.estado,
                      icon: null,
                    })
                  : { color: "default", label: "Por enviar", icon: null };

                return (
                  <div
                    key={requerido.tipo}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 16,
                      padding: "14px 0",
                      borderBottom: "1px solid rgba(5, 5, 5, 0.06)",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <Space wrap>
                        <Text strong>{requerido.nombre}</Text>
                        <Tag color={info.color} icon={info.icon}>
                          {info.label}
                        </Tag>
                      </Space>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {requerido.descripcion}
                        </Text>
                      </div>
                      {enviado?.estado === "rechazado" && enviado.nota_revision && (
                        <Text type="danger" style={{ fontSize: 12, display: "block" }}>
                          Observación: {enviado.nota_revision}
                        </Text>
                      )}
                      {enviado?.archivo_nombre && (
                        <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                          Enviaste: {enviado.archivo_nombre}
                        </Text>
                      )}
                    </div>
                    <Button
                      size="small"
                      type={enviado?.estado === "aprobado" ? "default" : "primary"}
                      ghost={enviado?.estado !== "aprobado"}
                      icon={<SendOutlined />}
                      disabled={enviado?.estado === "aprobado"}
                      onClick={() =>
                        setDocumento({ tipo: requerido.tipo, nombre: requerido.nombre })
                      }
                    >
                      {enviado ? "Reenviar" : "Enviar"}
                    </Button>
                  </div>
                );
              })}
            </Card>

            <Alert
              type="info"
              showIcon
              message="¿Qué pasa después?"
              description={
                <Paragraph style={{ marginBottom: 0 }}>
                  Cuando tu documentación esté completa y aprobada, tu asesor se pone en contacto
                  para continuar con la compra del lote.
                </Paragraph>
              }
            />

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <Button onClick={cambiarEmail}>Usar otro email</Button>
            </div>
          </div>
        )}
      </div>

      <UploadDocumentoProspecto
        open={!!documento}
        documento={documento}
        enviando={enviar.isPending}
        onClose={() => setDocumento(null)}
        onEnviar={({ file }) => {
          if (!documento || !prospecto) return;
          enviar.mutate(
            { idProspecto: prospecto.id_prospecto, tipo: documento.tipo, file },
            {
              onSuccess: (resultado) => {
                if (resultado.ok) setDocumento(null);
              },
            },
          );
        }}
      />
    </div>
  );
}
