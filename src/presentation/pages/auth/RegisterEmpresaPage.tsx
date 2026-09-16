import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Form, Input, Button, Typography, Alert, message } from "antd";
import { MailOutlined, LockOutlined, UserOutlined, BankOutlined, EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { registroEmpresaSchema } from "@/presentation/validations";

const { Text } = Typography;

export function RegisterEmpresaPage() {
  const navigate = useNavigate();
  const { registerNuevaEmpresa } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values: { email: string; password: string; nombres: string; razon_social: string }) => {
    setLoading(true);
    setError(null);

    const parsed = registroEmpresaSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos invalidos");
      setLoading(false);
      return;
    }

    const result = await registerNuevaEmpresa(parsed.data.email, parsed.data.password, parsed.data.nombres, parsed.data.razon_social);

    if (!result.success) {
      setError(result.error || "Error al crear la empresa");
      setLoading(false);
      return;
    }

    messageApi.success("Empresa y cuenta creadas correctamente");
    setTimeout(() => {
      navigate("/dashboard");
    }, 500);
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
          maxWidth: 420,
          background: "#fff",
          borderRadius: 16,
          padding: "48px 40px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img
            src="/logo-light.png"
            alt="Lotes al Mando"
            style={{ maxHeight: 90, marginBottom: 8 }}
          />
          <Text type="secondary" style={{ fontSize: 14, display: "block", marginTop: 8 }}>
            Crea tu empresa para empezar a usar Lotes al Mando
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

        <Form layout="vertical" onFinish={onFinish} size="large">
          <Form.Item
            name="razon_social"
            rules={[{ required: true, message: "Ingresa el nombre de tu empresa" }]}
          >
            <Input
              prefix={<BankOutlined style={{ color: "#bfbfbf" }} />}
              placeholder="Nombre de tu empresa"
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
              iconRender={(visible) =>
                visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />
              }
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
              Crear Empresa y Cuenta
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Ya tienes una invitacion? <Link to="/registro">Registrate aqui</Link>
          </Text>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
          </Text>
        </div>
      </div>
    </div>
  );
}
