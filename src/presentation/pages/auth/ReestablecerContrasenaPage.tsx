import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Form, Input, Button, Typography, Alert, Spin } from "antd";
import { LockOutlined, EyeTwoTone, EyeInvisibleOutlined } from "@ant-design/icons";
import { supabase } from "@/infrastructure/supabase/client";
import { useAuth } from "@/presentation/providers/AuthProvider";
import { nuevaContrasenaSchema } from "@/presentation/validations";

const { Text } = Typography;

/**
 * Paso 2 de "olvidé mi contraseña": la persona llega desde el enlace del
 * correo. supabase-js intercambia el token del enlace por una sesión de
 * recuperación al arrancar la página, así que si el enlace es válido ya
 * hay sesión cuando resuelve getSession(). Ahí define su contraseña
 * nueva, que además borra el sello de vencimiento de 24h.
 */
export function ReestablecerContrasenaPage() {
  const navigate = useNavigate();
  const { cambiarPassword } = useAuth();
  const [verificando, setVerificando] = useState(true);
  const [enlaceValido, setEnlaceValido] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let activo = true;

    const chequearEnlace = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!activo) return;
      setEnlaceValido(!!session);
      setVerificando(false);
    };

    chequearEnlace();

    return () => {
      activo = false;
    };
  }, []);

  const onFinish = async (values: { password: string; confirmacion: string }) => {
    setError(null);

    const parsed = nuevaContrasenaSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos invalidos");
      return;
    }

    setLoading(true);
    const result = await cambiarPassword(parsed.data.password);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "No se pudo cambiar la contraseña");
      return;
    }

    // Se cierra la sesión de recuperación: el nuevo ingreso se hace con la
    // contraseña recién definida.
    await supabase.auth.signOut();
    navigate("/login", { state: { contrasenaCambiada: true, avisoPassword: result.aviso } });
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
            Define tu contraseña
          </Text>
        </div>

        {verificando ? (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <Spin />
          </div>
        ) : !enlaceValido ? (
          <>
            <Alert
              message="Enlace no valido o expirado"
              description="Este enlace de recuperacion ya no sirve. Pedí uno nuevo y usalo dentro de la hora."
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
            />
            <Button
              type="primary"
              block
              style={{ height: 44, background: "#10B981", borderColor: "#10B981" }}
              onClick={() => navigate("/olvide-contrasena")}
            >
              Pedir un enlace nuevo
            </Button>
          </>
        ) : (
          <>
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
                name="password"
                label="Nueva contraseña"
                rules={[{ required: true, message: "Ingresa tu nueva contraseña" }]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
                  placeholder="Nueva contraseña"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                />
              </Form.Item>

              <Form.Item
                name="confirmacion"
                label="Repetir contraseña"
                dependencies={["password"]}
                rules={[
                  { required: true, message: "Repite tu nueva contraseña" },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue("password") === value) return Promise.resolve();
                      return Promise.reject(new Error("Las contraseñas no coinciden"));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined style={{ color: "#bfbfbf" }} />}
                  placeholder="Repetir contraseña"
                  iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
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
                  Guardar contraseña
                </Button>
              </Form.Item>
            </Form>
          </>
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
