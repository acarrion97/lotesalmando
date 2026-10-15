import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { CopyOutlined, DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import {
  usePuede,
  usePartnerships,
  useGuardarPartnership,
  useEliminarPartnership,
  useEmpresas,
} from "@/presentation/hooks";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import type { PartnershipDto } from "@/application/partnership/dto/PartnershipDto";
import type { GuardarPartnershipInput } from "@/application/partnership/use-cases/GuardarPartnershipUseCase";

const { Text, Paragraph } = Typography;

interface FormValues {
  nombre: string;
  codigo: string;
  email?: string;
  estado: string;
}

const estadoColor = (estado: string) =>
  (estado ?? "").toLowerCase() === "activo" ? "green" : "red";

/**
 * Panel del superadmin para administrar los partners (vendedores/afiliados de
 * la plataforma): nombre, código único (el que las empresas escriben al
 * registrarse), email y estado.
 *
 * Tras el permiso `ver_partnerships`. Crear/editar/eliminar exigen además
 * `crear_partnerships` / `editar_partnerships` / `eliminar_partnerships`, y la
 * BD (RLS de la migración 029) los vuelve a validar en el servidor.
 */
export function PartnershipsPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const { data: partners, isLoading } = usePartnerships();
  const guardar = useGuardarPartnership();
  const eliminar = useEliminarPartnership();

  // Empresas de TODA la plataforma, para contar cuántas se registraron con
  // el código de cada partner (el RLS de `empresa` está deshabilitado desde
  // la migración 008, así que el superadmin ve todas).
  const { data: empresas } = useEmpresas();

  const puedeCrear = usePuede("crear_partnerships");
  const puedeEditar = usePuede("editar_partnerships");
  const puedeEliminar = usePuede("eliminar_partnerships");

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<PartnershipDto | null>(null);
  const [form] = Form.useForm<FormValues>();

  const empresasPorPartner = useMemo(() => {
    const mapa = new Map<number, number>();
    for (const e of empresas ?? []) {
      if (e.id_partner == null) continue;
      mapa.set(e.id_partner, (mapa.get(e.id_partner) ?? 0) + 1);
    }
    return mapa;
  }, [empresas]);

  const columnas: TableColumnType<PartnershipDto>[] = useMemo(
    () => [
      {
        title: "Nombre",
        dataIndex: "nombre",
        key: "nombre",
        sorter: (a, b) => a.nombre.localeCompare(b.nombre),
        defaultSortOrder: "ascend",
      },
      {
        title: "Código",
        dataIndex: "codigo",
        key: "codigo",
        render: (codigo: string) => (
          <Space size={4}>
            <Text code>{codigo}</Text>
            <Tooltip title="Copiar código">
              <Button
                type="text"
                size="small"
                icon={<CopyOutlined />}
                onClick={() => {
                  void navigator.clipboard?.writeText(codigo);
                  messageApi.success(`Código "${codigo}" copiado`);
                }}
              />
            </Tooltip>
          </Space>
        ),
      },
      {
        title: "Empresas",
        key: "empresas",
        width: 110,
        sorter: (a, b) =>
          (empresasPorPartner.get(a.id_partner) ?? 0) - (empresasPorPartner.get(b.id_partner) ?? 0),
        render: (_: unknown, fila: PartnershipDto) => {
          const total = empresasPorPartner.get(fila.id_partner) ?? 0;
          return (
            <Tooltip title="Empresas que se registraron con este código">
              <Text>{total}</Text>
            </Tooltip>
          );
        },
      },
      {
        title: "Email",
        dataIndex: "email",
        key: "email",
        ellipsis: true,
        render: (email: string | null) => email || <Text type="secondary">—</Text>,
      },
      {
        title: "Estado",
        dataIndex: "estado",
        key: "estado",
        width: 120,
        filters: [
          { text: "Activo", value: "activo" },
          { text: "Inactivo", value: "inactivo" },
        ],
        onFilter: (valor, fila) => (fila.estado ?? "").toLowerCase() === valor,
        render: (estado: string) => <Tag color={estadoColor(estado)}>{estado || "—"}</Tag>,
      },
      {
        title: "Creado",
        dataIndex: "created_at",
        key: "created_at",
        width: 120,
        render: (iso: string | null) =>
          iso ? new Date(iso).toLocaleDateString() : <Text type="secondary">—</Text>,
      },
      {
        title: "Acciones",
        key: "acciones",
        width: 180,
        render: (_: unknown, fila: PartnershipDto) => (
          <Space>
            <Tooltip title={puedeEditar ? "Editar" : "Requiere el permiso editar_partnerships"}>
              <Button
                type="link"
                icon={<EditOutlined />}
                disabled={!puedeEditar}
                onClick={() => abrirEdicion(fila)}
              >
                Editar
              </Button>
            </Tooltip>
            <Popconfirm
              title={`¿Eliminar el partner "${fila.nombre}"?`}
              description="Las empresas que se registraron con su código quedan sin partner; no se borran."
              okText="Eliminar"
              cancelText="Cancelar"
              disabled={!puedeEliminar}
              onConfirm={() => eliminarPartner(fila)}
            >
              <Tooltip
                title={puedeEliminar ? "Eliminar" : "Requiere el permiso eliminar_partnerships"}
              >
                <Button type="link" danger icon={<DeleteOutlined />} disabled={!puedeEliminar}>
                  Eliminar
                </Button>
              </Tooltip>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [puedeEditar, puedeEliminar, empresasPorPartner],
  );

  function mensajeDeError(error: unknown): string {
    return error instanceof Error ? error.message : "No se pudo guardar el partner";
  }

  function abrirNuevo() {
    setEditando(null);
    form.resetFields();
    form.setFieldsValue({ estado: "activo" });
    setAbierto(true);
  }

  function abrirEdicion(partner: PartnershipDto) {
    setEditando(partner);
    form.setFieldsValue({
      nombre: partner.nombre,
      codigo: partner.codigo,
      email: partner.email ?? undefined,
      estado: partner.estado,
    });
    setAbierto(true);
  }

  async function eliminarPartner(partner: PartnershipDto) {
    try {
      await eliminar.mutateAsync(partner.id_partner);
      messageApi.success(`Partner "${partner.nombre}" eliminado`);
    } catch (error) {
      messageApi.error(mensajeDeError(error));
    }
  }

  async function onFinish(values: FormValues) {
    const input: GuardarPartnershipInput = {
      nombre: values.nombre,
      codigo: values.codigo,
      email: values.email ?? null,
      estado: values.estado,
    };

    try {
      await guardar.mutateAsync({ idPartner: editando?.id_partner ?? null, input });
      messageApi.success(editando ? "Partner actualizado" : "Partner creado");
      setAbierto(false);
      form.resetFields();
      setEditando(null);
    } catch (error) {
      messageApi.error(mensajeDeError(error));
    }
  }

  return (
    <div>
      {contextHolder}
      <PageToolbar
        title="Partners"
        subtitle="Vendedores/afiliados de la plataforma. Su código es el que las empresas escriben al registrarse."
        actions={
          puedeCrear ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
              Nuevo Partner
            </Button>
          ) : null
        }
      />

      {!puedeCrear && !puedeEditar && (
        <Alert
          type="warning"
          showIcon
          message="No tienes permisos de gestión de partners (crear_partnerships / editar_partnerships)."
          style={{ marginBottom: 16 }}
        />
      )}

      <DataTable<PartnershipDto>
        loading={isLoading || guardar.isPending}
        dataSource={partners ?? []}
        rowKey="id_partner"
        columns={columnas}
      />

      <Modal
        title={editando ? `Editar "${editando.nombre}"` : "Nuevo Partner"}
        open={abierto}
        onCancel={() => setAbierto(false)}
        onOk={() => form.submit()}
        confirmLoading={guardar.isPending}
        okText="Guardar"
        cancelText="Cancelar"
        width={560}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[
                  { required: true, message: "Ingresa el nombre del partner" },
                  { min: 2, message: "Mínimo 2 caracteres" },
                ]}
              >
                <Input placeholder="Nombre del vendedor o empresa" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="codigo"
                label="Código"
                tooltip="Único. Es lo que escribe la empresa en el registro para vincularse a este partner."
                rules={[
                  { required: true, message: "Ingresa el código del partner" },
                  {
                    pattern: /^[A-Za-z0-9_-]+$/,
                    message: "Solo letras, números, guiones y guiones bajos",
                  },
                ]}
              >
                <Input placeholder="PARTNER01" style={{ textTransform: "uppercase" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="email"
                label="Email"
                tooltip="Opcional"
                rules={[{ type: "email", message: "Correo no válido" }]}
              >
                <Input placeholder="partner@empresa.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="estado"
                label="Estado"
                rules={[{ required: true, message: "Selecciona el estado" }]}
              >
                <Select
                  options={[
                    { value: "activo", label: "Activo" },
                    { value: "inactivo", label: "Inactivo" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
            Si cambiás el código de un partner, las empresas que ya se registraron conservan su
            vínculo: solo el código nuevo sirve para registrarse.
          </Paragraph>
        </Form>
      </Modal>
    </div>
  );
}
