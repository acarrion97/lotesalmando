import { useState } from "react";
import { Link } from "react-router-dom";
import { Form, Input, Button, Typography, Alert } from "antd";
import { MailOutlined } from "@ant-design/icons";
import { supabase } from "@/infrastructure/supabase/client";

const { Text } = Typography;

/**
 * Paso 1 de "olvidé mi contraseña": pide el correo y Supabase envía el
 * enlace de recuperación. El enlace cae en /reestablecer-contrasena
 * (redirectTo), donde la persona define la contraseña nueva.
 */
export function OlvideContrasenaPage() {
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFinish = async (values: { email: string }) => {
    setLoading(true);
    setError(null);

    // No importa si el correo existe o no: el mensaje es el mismo para no
    // revelar quiénes están dados de alta en la plataforma.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/reestablecer-contrasena`,
    });

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setEnviado(true);
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
            Recupera el acceso a tu cuenta
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

        {enviado ? (
          <>
            <Alert
              message="Revisa tu correo"
              description="Si existe una cuenta con ese correo, te enviamos un enlace para restablecer tu contraseña. El enlace vence en una hora."
              type="success"
              showIcon
              style={{ marginBottom: 24 }}
            />
            <Button type="primary" block style={{ height: 44 }} onClick={() => setEnviado(false)}>
              Probar con otro correo
            </Button>
          </>
        ) : (
          <Form layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="email"
              label="Correo electronico"
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
                Enviar enlace de recuperacion
              </Button>
            </Form.Item>
          </Form>
        )}

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <Link to="/login">Volver a iniciar sesion</Link>
          </Text>
        </div>
      </div>
    </div>
  );
}
