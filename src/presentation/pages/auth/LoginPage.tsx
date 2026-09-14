import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Form, Input, Button, Typography, Alert, message } from "antd";
import { MailOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from "@ant-design/icons";
import { useAuth } from "@/presentation/providers/AuthProvider";

const { Text } = Typography;

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);

    const result = await login(values.email, values.password);

    if (!result.success) {
      setError(result.error || "Error al iniciar sesion");
      setLoading(false);
      return;
    }

    messageApi.success("Sesion iniciada correctamente");
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
            Inicia sesion para continuar
          </Text>
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ marginBottom: 24 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} size="large">
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
            rules={[{ required: true, message: "Ingresa tu contrasena" }]}
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
              Iniciar Sesion
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            No tienes cuenta? <Link to="/registro">Registrate aqui</Link>
          </Text>
        </div>
      </div>
    </div>
  );
}
