import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import {
  BankOutlined,
  CopyOutlined,
  EyeInvisibleOutlined,
  EyeTwoTone,
  MailOutlined,
  PlusOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useEmpresas, useCreateEmpresaConAdmin } from "@/presentation/hooks";
import { usePuede } from "@/presentation/hooks";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { passwordDeEmail } from "@/utils";
import type { Empresa } from "@/domain/empresa/entities";

const { Text, Paragraph } = Typography;

const estadoColor = (estado: string) =>
  (estado ?? "").toLowerCase() === "activo" ? "green" : "red";

interface FormValues {
  razon_social: string;
  ruc: string;
  admin_nombres: string;
  admin_email: string;
}

/**
 * Sección de superadmin para dar de alta una empresa nueva en la plataforma,
 * junto con su cuenta de admin de acceso (fila `usuario` + Supabase Auth),
 * en una sola operación vía la RPC `crear_empresa_con_admin`.
 *
 * Tras la ventana tras el permiso `ver_empresas`. El botón de crear exige
 * además `crear_empresas`, y la RPC lo vuelve a validar en el servidor.
 */
export function EmpresasPage() {
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const { data: empresas, isLoading } = useEmpresas();
  const crearMutation = useCreateEmpresaConAdmin();

  const puedeCrear = usePuede("crear_empresas");

  const [abierto, setAbierto] = useState(false);
  const [creada, setCreada] = useState<Empresa | null>(null);
  const [form] = Form.useForm<FormValues>();

  const emailAdmin = Form.useWatch("admin_email", form) ?? "";
  const passwordSugerida = useMemo(() => passwordDeEmail(emailAdmin || "admin@empresa.com"), [emailAdmin]);

  const columnas: TableColumnType<Empresa>[] = useMemo(
    () => [
      {
        title: "Razón Social",
        dataIndex: "razon_social",
        key: "razon_social",
        sorter: (a, b) => a.razon_social.localeCompare(b.razon_social),
        defaultSortOrder: "ascend",
      },
      {
        title: "RUC",
        dataIndex: "ruc",
        key: "ruc",
        render: (ruc: string) => ruc || <Text type="secondary">—</Text>,
      },
      {
        title: "Estado",
        dataIndex: "estado",
        key: "estado",
        filters: [
          { text: "Activo", value: "activo" },
          { text: "Inactivo", value: "inactivo" },
        ],
        onFilter: (valor, fila) => (fila.estado ?? "").toLowerCase() === valor,
        render: (estado: string) => <Tag color={estadoColor(estado)}>{estado ?? "—"}</Tag>,
      },
      {
        title: "Registrada",
        dataIndex: "created_at",
        key: "created_at",
        render: (iso: string | null) =>
          iso ? new Date(iso).toLocaleDateString() : <Text type="secondary">—</Text>,
      },
    ],
    [],
  );

  const abrirModal = () => {
    form.resetFields();
    setCreada(null);
    setAbierto(true);
  };

  const cerrarModal = () => {
    setAbierto(false);
    setCreada(null);
  };

  const onFinish = async (values: FormValues) => {
    try {
      const empresa = await crearMutation.mutateAsync({
        razon_social: values.razon_social,
        ruc: values.ruc?.trim() || null,
        admin_nombres: values.admin_nombres,
        admin_email: values.admin_email,
        admin_password: passwordDeEmail(values.admin_email),
      });

      setCreada(empresa);
      await queryClient.invalidateQueries({ queryKey: ["empresas"] });
      messageApi.success(`Empresa "${empresa.razon_social}" creada correctamente`);
      form.resetFields();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo crear la empresa");
    }
  };

  const copiarCredenciales = () => {
    if (!creada) return;
    const email = emailAdmin.trim().toLowerCase();
    const texto = `Empresa: ${creada.razon_social}\nEmail: ${email}\nContraseña: ${passwordDeEmail(email)}`;
    void navigator.clipboard?.writeText(texto);
    messageApi.success("Credenciales copiadas al portapapeles");
  };

  return (
    <div>
      {contextHolder}
      <PageToolbar
        title="Empresas"
        subtitle="Alta de empresas en la plataforma, con su cuenta de admin."
        actions={
          puedeCrear ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirModal}>
              Nueva Empresa
            </Button>
          ) : null
        }
      />

      {!puedeCrear && (
        <Alert
          type="warning"
          showIcon
          message="No tienes el permiso `crear_empresas` para dar de alta empresas."
          style={{ marginBottom: 16 }}
        />
      )}

      <DataTable<Empresa>
        loading={isLoading}
        dataSource={empresas ?? []}
        rowKey="id_empresa"
        columns={columnas}
      />

      {/* ---------------- Modal: nueva empresa ---------------- */}
      <Modal
        title="Nueva Empresa"
        open={abierto}
        onCancel={cerrarModal}
        footer={null}
        width={560}
        destroyOnHidden
      >
        {creada ? (
          <div>
            <Alert
              type="success"
              showIcon
              message={`Empresa "${creada.razon_social}" creada`}
              description="El admin ya puede iniciar sesión con estas credenciales. Guárdalas o cópialas: la contraseña no se puede recuperar después."
              style={{ marginBottom: 16 }}
            />
            <Descriptions bordered size="small" column={1}>
              <Descriptions.Item label="Empresa">{creada.razon_social}</Descriptions.Item>
              <Descriptions.Item label="Email admin">
                {emailAdmin.trim().toLowerCase()}
              </Descriptions.Item>
              <Descriptions.Item label="Contraseña">
                <Space>
                  <Text code>{passwordDeEmail(emailAdmin)}</Text>
                  <Tooltip title="Copiar credenciales">
                    <Button size="small" icon={<CopyOutlined />} onClick={copiarCredenciales} />
                  </Tooltip>
                </Space>
              </Descriptions.Item>
            </Descriptions>
            <Button type="primary" block style={{ marginTop: 16 }} onClick={cerrarModal}>
              Entendido
            </Button>
          </div>
        ) : (
          <Form form={form} layout="vertical" onFinish={onFinish} size="large">
            <Form.Item
              name="razon_social"
              label="Razón social"
              rules={[
                { required: true, message: "Ingresa la razón social" },
                { min: 2, message: "Mínimo 2 caracteres" },
              ]}
            >
              <Input prefix={<BankOutlined style={{ color: "#bfbfbf" }} />} placeholder="Nombre de la empresa" />
            </Form.Item>

            <Form.Item name="ruc" label="RUC" tooltip="Opcional">
              <Input placeholder="RUC de la empresa" />
            </Form.Item>

            <Form.Item
              name="admin_nombres"
              label="Nombre del admin"
              rules={[
                { required: true, message: "Ingresa el nombre del admin" },
                { min: 2, message: "Mínimo 2 caracteres" },
              ]}
            >
              <Input prefix={<UserOutlined style={{ color: "#bfbfbf" }} />} placeholder="Nombre completo" />
            </Form.Item>

            <Form.Item
              name="admin_email"
              label="Email del admin"
              rules={[
                { required: true, message: "Ingresa el correo del admin" },
                { type: "email", message: "Correo no válido" },
              ]}
            >
              <Input
                prefix={<MailOutlined style={{ color: "#bfbfbf" }} />}
                placeholder="admin@empresa.com"
              />
            </Form.Item>

            <Form.Item label="Contraseña temporal">
              <Input.Password
                value={passwordSugerida}
                readOnly
                iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Se genera automáticamente a partir del correo (parte antes de la @ + “*”). El
                admin podrá cambiarla después.
              </Text>
            </Form.Item>

            <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
              Se creará la empresa y la cuenta de admin en una sola operación. La RPC exige en el
              servidor que tengas el permiso <Text code>crear_empresas</Text>.
            </Paragraph>

            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={cerrarModal}>Cancelar</Button>
              <Button type="primary" htmlType="submit" loading={crearMutation.isPending}>
                Crear Empresa
              </Button>
            </Space>
          </Form>
        )}
      </Modal>

      {/* Nota de arquitectura: la columna "Usuarios" se muestra en /plataforma,
          donde se agregan todos los usuarios; acá solo interesan los datos de
          la propia empresa. */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              ¿Cuántas empresas y usuarios hay en total? Ver el{" "}
              <a href="/plataforma">dashboard de plataforma</a>.
            </Text>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
