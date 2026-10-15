import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Space,
  Switch,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import { DeleteOutlined, EditOutlined, PictureOutlined, PlusOutlined } from "@ant-design/icons";
import type { TableColumnType, UploadFile } from "antd";
import { usePuede, usePlanes, useGuardarPlan, useEliminarPlan, useSubirImagenPlan } from "@/presentation/hooks";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import type { PlanDto } from "@/application/plan/dto/PlanDto";
import type { GuardarPlanInput } from "@/application/plan/use-cases/GuardarPlanUseCase";

const { Text, Paragraph } = Typography;

interface FormValues {
  clave: string;
  nombre: string;
  descripcion?: string;
  url_checkout?: string;
  orden: number;
  activo: boolean;
  max_proyectos?: number | null;
  max_lotes_por_proyecto?: number | null;
  max_usuarios?: number | null;
}

/** Texto compacto de los limites de un plan (NULL = sin limite). */
function limitesTexto(p: PlanDto): string {
  const items: string[] = [];
  if (p.max_proyectos != null) items.push(`${p.max_proyectos} proyecto${p.max_proyectos === 1 ? "" : "s"}`);
  if (p.max_lotes_por_proyecto != null) items.push(`${p.max_lotes_por_proyecto} lotes/proyecto`);
  if (p.max_usuarios != null) items.push(`${p.max_usuarios} usuario${p.max_usuarios === 1 ? "" : "s"}`);
  return items.join(" · ");
}

/**
 * Panel del superadmin para administrar los planes de pago: nombre,
 * descripcion, imagen, link de checkout (Hotmart), orden, activo y
 * limites (proyectos, lotes por proyecto, usuarios).
 *
 * Tras el permiso `ver_planes`. Crear/editar/eliminar exigen ademas
 * `crear_planes` / `editar_planes` / `eliminar_planes`, y la BD (RLS de la
 * migracion 028) los vuelve a validar en el servidor.
 */
export function PlanesPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const { data: planes, isLoading } = usePlanes();
  const guardar = useGuardarPlan();
  const eliminar = useEliminarPlan();
  const subirImagen = useSubirImagenPlan();

  const puedeCrear = usePuede("crear_planes");
  const puedeEditar = usePuede("editar_planes");
  const puedeEliminar = usePuede("eliminar_planes");

  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<PlanDto | null>(null);
  const [imagenUrl, setImagenUrl] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [form] = Form.useForm<FormValues>();

  const columnas: TableColumnType<PlanDto>[] = useMemo(
    () => [
      {
        title: "Imagen",
        dataIndex: "imagen_url",
        key: "imagen_url",
        width: 96,
        render: (url: string | null) =>
          url ? (
            <Image src={url} alt="plan" width={72} height={48} style={{ objectFit: "contain", background: "#fafafa", borderRadius: 8 }} preview={false} />
          ) : (
            <PictureOutlined style={{ fontSize: 22, color: "#bfbfbf" }} />
          ),
      },
      {
        title: "Nombre",
        dataIndex: "nombre",
        key: "nombre",
        sorter: (a, b) => a.nombre.localeCompare(b.nombre),
        render: (nombre: string, fila) => (
          <Space direction="vertical" size={0}>
            <Text strong>{nombre}</Text>
            <Text type="secondary" code>{fila.clave}</Text>
          </Space>
        ),
      },
      {
        title: "Descripción",
        dataIndex: "descripcion",
        key: "descripcion",
        ellipsis: true,
        width: 280,
        render: (texto: string | null) => texto || <Text type="secondary">—</Text>,
      },
      {
        title: "Límites",
        key: "limites",
        render: (_: unknown, fila: PlanDto) => {
          const texto = limitesTexto(fila);
          return texto ? <Text>{texto}</Text> : <Text type="secondary">Sin límites</Text>;
        },
      },
      {
        title: "Orden",
        dataIndex: "orden",
        key: "orden",
        width: 90,
        sorter: (a, b) => a.orden - b.orden,
      },
      {
        title: "Activo",
        dataIndex: "activo",
        key: "activo",
        width: 90,
        render: (activo: boolean, fila: PlanDto) => (
          <Switch
            checked={activo}
            disabled={!puedeEditar || guardar.isPending}
            onChange={(valor) =>
              guardar.mutate(
                {
                  idPlan: fila.id_plan,
                  input: { ...deDtoAInput(fila), activo: valor },
                  imagenAnteriorUrl: fila.imagen_url,
                },
                {
                  onSuccess: () => messageApi.success(`Plan "${fila.nombre}" ${valor ? "activado" : "desactivado"}`),
                  onError: (error) => messageApi.error(mensajeDeError(error)),
                }
              )
            }
          />
        ),
      },
      {
        title: "Acciones",
        key: "acciones",
        width: 180,
        render: (_: unknown, fila: PlanDto) => (
          <Space>
            <Tooltip title={puedeEditar ? "Editar" : "Requiere el permiso editar_planes"}>
              <Button type="link" icon={<EditOutlined />} disabled={!puedeEditar} onClick={() => abrirEdicion(fila)}>
                Editar
              </Button>
            </Tooltip>
            <Popconfirm
              title={`¿Eliminar el plan "${fila.nombre}"?`}
              description="Las empresas que lo tengan asignado quedarán sin límites de plan."
              okText="Eliminar"
              cancelText="Cancelar"
              disabled={!puedeEliminar}
              onConfirm={() => eliminarPlan(fila)}
            >
              <Tooltip title={puedeEliminar ? "Eliminar" : "Requiere el permiso eliminar_planes"}>
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
    [puedeEditar, puedeEliminar, guardar.isPending]
  );

  function mensajeDeError(error: unknown): string {
    return error instanceof Error ? error.message : "No se pudo guardar el plan";
  }

  function deDtoAInput(plan: PlanDto): GuardarPlanInput {
    return {
      clave: plan.clave,
      nombre: plan.nombre,
      descripcion: plan.descripcion,
      imagen_url: plan.imagen_url,
      url_checkout: plan.url_checkout,
      orden: plan.orden,
      activo: plan.activo,
      max_proyectos: plan.max_proyectos,
      max_lotes_por_proyecto: plan.max_lotes_por_proyecto,
      max_usuarios: plan.max_usuarios,
    };
  }

  function abrirNuevo() {
    setEditando(null);
    setImagenUrl(null);
    setFileList([]);
    form.resetFields();
    form.setFieldsValue({ orden: (planes ?? []).length + 1, activo: true });
    setAbierto(true);
  }

  function abrirEdicion(plan: PlanDto) {
    setEditando(plan);
    setImagenUrl(plan.imagen_url);
    setFileList(plan.imagen_url ? [{ uid: "-1", name: "imagen-actual", status: "done", url: plan.imagen_url }] : []);
    form.setFieldsValue({
      clave: plan.clave,
      nombre: plan.nombre,
      descripcion: plan.descripcion ?? undefined,
      url_checkout: plan.url_checkout ?? undefined,
      orden: plan.orden,
      activo: plan.activo,
      max_proyectos: plan.max_proyectos,
      max_lotes_por_proyecto: plan.max_lotes_por_proyecto,
      max_usuarios: plan.max_usuarios,
    });
    setAbierto(true);
  }

  async function onSubir(file: File) {
    const { url } = await subirImagen.mutateAsync(file);
    setImagenUrl(url);
    setFileList([{ uid: "-1", name: file.name, status: "done", url }]);
  }

  function quitarImagen() {
    setImagenUrl(null);
    setFileList([]);
  }

  async function eliminarPlan(plan: PlanDto) {
    try {
      await eliminar.mutateAsync({ idPlan: plan.id_plan, imagenUrl: plan.imagen_url });
      messageApi.success(`Plan "${plan.nombre}" eliminado`);
    } catch (error) {
      messageApi.error(mensajeDeError(error));
    }
  }

  async function onFinish(values: FormValues) {
    const input: GuardarPlanInput = {
      clave: values.clave,
      nombre: values.nombre,
      descripcion: values.descripcion ?? null,
      imagen_url: imagenUrl,
      url_checkout: values.url_checkout ?? null,
      orden: values.orden ?? 0,
      activo: values.activo ?? true,
      max_proyectos: values.max_proyectos ?? null,
      max_lotes_por_proyecto: values.max_lotes_por_proyecto ?? null,
      max_usuarios: values.max_usuarios ?? null,
    };

    try {
      await guardar.mutateAsync({
        idPlan: editando?.id_plan ?? null,
        input,
        imagenAnteriorUrl: editando?.imagen_url ?? null,
      });
      messageApi.success(editando ? "Plan actualizado" : "Plan creado");
      setAbierto(false);
      form.resetFields();
      setEditando(null);
      setImagenUrl(null);
      setFileList([]);
    } catch (error) {
      messageApi.error(mensajeDeError(error));
    }
  }

  return (
    <div>
      {contextHolder}
      <PageToolbar
        title="Planes"
        subtitle="Planes de pago que elige la empresa al registrarse: nombre, imagen, checkout y límites."
        actions={
          puedeCrear ? (
            <Button type="primary" icon={<PlusOutlined />} onClick={abrirNuevo}>
              Nuevo Plan
            </Button>
          ) : null
        }
      />

      {!puedeCrear && !puedeEditar && (
        <Alert
          type="warning"
          showIcon
          message="No tienes permisos de gestión de planes (crear_planes / editar_planes)."
          style={{ marginBottom: 16 }}
        />
      )}

      <DataTable<PlanDto>
        loading={isLoading || guardar.isPending}
        dataSource={planes ?? []}
        rowKey="id_plan"
        columns={columnas}
      />

      <Modal
        title={editando ? `Editar "${editando.nombre}"` : "Nuevo Plan"}
        open={abierto}
        onCancel={() => setAbierto(false)}
        onOk={() => form.submit()}
        confirmLoading={guardar.isPending}
        okText="Guardar"
        cancelText="Cancelar"
        width={680}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Row gutter={12}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="nombre"
                label="Nombre"
                rules={[{ required: true, message: "Ingresa el nombre del plan" }]}
              >
                <Input placeholder="Plan Basico" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="clave"
                label="Clave"
                tooltip="Identificador estable que se guarda en la empresa (basico, inicial, avanzado...). No se puede cambiar después."
                rules={[
                  { required: true, message: "Ingresa la clave del plan" },
                  { pattern: /^[a-z0-9_]+$/, message: "Solo minúsculas, números y guiones bajos" },
                ]}
              >
                <Input placeholder="basico" disabled={!!editando} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="descripcion" label="Descripción">
            <Input.TextArea rows={2} placeholder="Para arrancar a gestionar tus proyectos..." />
          </Form.Item>

          <Form.Item
            name="url_checkout"
            label="Link de pago (Hotmart)"
            rules={[{ type: "url", message: "Debe ser una URL válida" }]}
          >
            <Input placeholder="https://pay.hotmart.com/..." />
          </Form.Item>

          <Form.Item label="Imagen del plan" extra="PNG, JPG o WEBP, máximo 5 MB. Se muestra en la página de elección de plan.">
            <Upload
              accept="image/png,image/jpeg,image/webp"
              listType="picture-card"
              maxCount={1}
              fileList={fileList}
              disabled={subirImagen.isPending}
              beforeUpload={(file) => {
                if (file.size > 5 * 1024 * 1024) {
                  messageApi.error("La imagen supera los 5 MB");
                  return Upload.LIST_IGNORE;
                }
                return true;
              }}
              customRequest={async ({ file, onSuccess }) => {
                // El error se avisa con messageApi y se limpia la lista;
                // sin onSuccess el upload queda cancelado.
                try {
                  await onSubir(file as File);
                  onSuccess?.("ok");
                } catch (error) {
                  setFileList([]);
                  messageApi.error(mensajeDeError(error));
                }
              }}
              onRemove={quitarImagen}
            >
              {fileList.length === 0 && (
                <div>
                  <PlusOutlined />
                  <div style={{ marginTop: 8 }}>Subir</div>
                </div>
              )}
            </Upload>
          </Form.Item>

          <Row gutter={12}>
            <Col xs={24} sm={8}>
              <Form.Item
                name="max_proyectos"
                label="Máx. proyectos"
                tooltip="NULL = sin límite. El corte también lo aplica la base de datos."
              >
                <InputNumber min={1} placeholder="Sin límite" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                name="max_lotes_por_proyecto"
                label="Máx. lotes por proyecto"
                tooltip="NULL = sin límite."
              >
                <InputNumber min={1} placeholder="Sin límite" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="max_usuarios" label="Máx. usuarios" tooltip="NULL = sin límite.">
                <InputNumber min={1} placeholder="Sin límite" style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={12}>
            <Col xs={12}>
              <Form.Item name="orden" label="Orden de presentación" tooltip="Menor = se muestra primero.">
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={12}>
              <Form.Item name="activo" label="Activo" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 0 }}>
            Las empresas sin plan asignado quedan sin límites. Al cambiar los límites de un plan, las empresas que lo
            tengan respetan el nuevo tope en la siguiente operación.
          </Paragraph>
        </Form>
      </Modal>
    </div>
  );
}
