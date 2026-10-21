import { useState, useMemo } from "react";
import {
  Card,
  Button,
  Space,
  Input,
  Tag,
  Modal,
  Form,
  InputNumber,
  Select,
  Descriptions,
  message,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
  List,
} from "antd";
import { useQueryClient } from "@tanstack/react-query";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  TrophyOutlined,
  UserOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useAsesores, useLotes, useVentas, useUsuarios } from "@/presentation/hooks";
import type { Asesor, AsesorEstado } from "@/domain/asesor/entities/Asesor";
import { getContainer } from "@/infrastructure/container";
import { asesorSchema } from "@/presentation/validations";
import { dentroDelRango, formatDate, rangoDelPreset } from "@/utils";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { useEmpresa } from "@/presentation/providers/EmpresaProvider";
import { ZodError } from "zod";

const estadoConfig: Record<AsesorEstado, { color: string; label: string }> = {
  activo: { color: "green", label: "Activo" },
  inactivo: { color: "red", label: "Inactivo" },
};

interface ModalState {
  type: "view" | "edit" | "delete" | null;
  visible: boolean;
  record: Asesor | null;
}

/** Convierte el error capturado en un mensaje que el usuario pueda entender. */
function mensajeErrorAsesor(error: unknown, fallback: string): string {
  if (error instanceof ZodError) return error.issues[0]?.message ?? fallback;
  if (typeof error === "object" && error !== null && "code" in error) {
    // 23505 = unique_violation (codigo de asesor repetido en la empresa).
    if ((error as { code?: string }).code === "23505") {
      return "Ya existe un asesor con ese codigo en esta empresa.";
    }
    const mensaje = (error as { message?: string }).message;
    if (mensaje) return mensaje;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}

export function AsesoresPage() {
  const { data: asesores, isLoading } = useAsesores();
  const { data: lotes } = useLotes();
  const { data: ventas } = useVentas();
  const { data: usuarios } = useUsuarios();
  const { empresaActual } = useEmpresa();
  const [searchText, setSearchText] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  // Vincular/desvincular un usuario (rol Vendedor) a un asesor.
  const [vinculacion, setVinculacion] = useState<Asesor | null>(null);
  const [idUsuarioVincular, setIdUsuarioVincular] = useState<number | null>(null);
  const [vinculando, setVinculando] = useState(false);
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const container = getContainer();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["asesores"] });

  const filteredData = useMemo(() => {
    if (!asesores) return [];
    return asesores.filter(
      (a) =>
        a.nombre_comercial.toLowerCase().includes(searchText.toLowerCase()) ||
        a.codigo.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [asesores, searchText]);

  const stats = useMemo(() => {
    if (!asesores) return { total: 0, activos: 0, inactivos: 0, metaTotal: 0 };
    return {
      total: asesores.length,
      activos: asesores.filter((a) => a.estado === "activo").length,
      inactivos: asesores.filter((a) => a.estado === "inactivo").length,
      metaTotal: asesores.reduce((sum, a) => sum + (a.meta_ventas_mensual ?? 0), 0),
    };
  }, [asesores]);

  const getVentasMes = (asesorId: number) => {
    if (!ventas) return 0;
    // Meta mensual: solo las ventas del mes en curso (reloj de la empresa) y
    // registradas por este asesor, no por el usuario que abrió la venta.
    const mesActual = rangoDelPreset("mes-actual");
    return ventas
      .filter((v) => v.id_asesor === asesorId && dentroDelRango(v.created_at, mesActual))
      .reduce((sum, v) => sum + v.precio_final, 0);
  };
  const getVentasAsesor = (asesorId: number) => {
    if (!ventas) return [];
    return ventas.filter((v) => v.id_asesor === asesorId);
  };
  const loteDe = (loteId: number) => lotes?.find((lote) => lote.id_lote === loteId);

  const usuarioDe = (idUsuario: number | null) =>
    idUsuario ? usuarios?.find((u) => u.id_usuario === idUsuario) : undefined;

  const abrirVinculacion = (record: Asesor) => {
    setVinculacion(record);
    setIdUsuarioVincular(record.id_usuario);
  };

  // Un usuario no puede quedar vinculado a dos asesores a la vez.
  const opcionesUsuarios = useMemo(
    () =>
      (usuarios ?? [])
        .filter((u) => {
          if (u.id_usuario === vinculacion?.id_usuario) return true;
          if (u.estado !== "activo") return false;
          return !(asesores ?? []).some(
            (a) => a.id_usuario === u.id_usuario && a.id_asesor !== vinculacion?.id_asesor,
          );
        })
        .map((u) => ({ value: u.id_usuario, label: `${u.nombres} (${u.email})` })),
    [usuarios, asesores, vinculacion],
  );

  const handleVincular = async () => {
    if (!vinculacion) return;
    setVinculando(true);
    try {
      await container.updateAsesor.execute(vinculacion.id_asesor, { id_usuario: idUsuarioVincular });
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["usuarios"] });
      messageApi.success(
        idUsuarioVincular ? "Usuario vinculado al asesor" : "Usuario desvinculado del asesor",
      );
      setVinculacion(null);
      setIdUsuarioVincular(null);
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "No se pudo actualizar la vinculación",
      );
    } finally {
      setVinculando(false);
    }
  };

  const openModal = (type: "view" | "edit" | "delete", record: Asesor) => {
    setModal({ type, visible: true, record });
    if (type === "edit")
      editForm.setFieldsValue({
        codigo: record.codigo,
        nombre_comercial: record.nombre_comercial,
        meta_ventas_mensual: record.meta_ventas_mensual,
        estado: record.estado,
      });
  };

  const closeModal = () => {
    setModal({ type: null, visible: false, record: null });
    editForm.resetFields();
  };

  const handleEdit = async () => {
    if (!modal.record) return;
    try {
      const values = await editForm.validateFields();
      // Si el codigo no cambio respecto al guardado, se omite para no bloquear la
      // edicion de registros cuyo codigo heredado no cumple el formato actual.
      const payload: typeof values = { ...values };
      if ((payload.codigo ?? "").trim().toUpperCase() === modal.record.codigo.trim().toUpperCase()) {
        delete payload.codigo;
      }
      const parsed = asesorSchema.partial().parse(payload);
      await container.updateAsesor.execute(modal.record.id_asesor, parsed);
      await refresh();
      messageApi.success("Asesor actualizado");
      closeModal();
    } catch (error) {
      messageApi.error(mensajeErrorAsesor(error, "No se pudo actualizar el asesor"));
    }
  };

  const handleDelete = async () => {
    if (!modal.record) return;
    try {
      await container.deleteAsesor.execute(modal.record.id_asesor);
      await refresh();
      messageApi.success("Asesor eliminado");
      closeModal();
    } catch (error) {
      if (error instanceof Error) messageApi.error(error.message);
      else messageApi.error("Error");
    }
  };

  const handleCreate = async () => {
    if (!empresaActual) {
      messageApi.error("No se pudo determinar la empresa actual");
      return;
    }

    try {
      const values = await createForm.validateFields();
      const parsed = asesorSchema.parse(values);
      await container.createAsesor.execute({
        ...parsed,
        id_empresa: empresaActual.id_empresa,
        id_usuario: null,
      });
      await refresh();
      messageApi.success("Asesor creado");
      setCreateModalOpen(false);
      createForm.resetFields();
    } catch (error) {
      messageApi.error(mensajeErrorAsesor(error, "No se pudo crear el asesor"));
    }
  };

  const columns: TableColumnType<Asesor>[] = [
    {
      title: "Codigo",
      dataIndex: "codigo",
      key: "codigo",
      sorter: (a, b) => a.codigo.localeCompare(b.codigo),
      render: (text: string) => (
        <Tag color="blue" style={{ fontWeight: 600 }}>
          {text}
        </Tag>
      ),
    },
    {
      title: "Nombre",
      dataIndex: "nombre_comercial",
      key: "nombre_comercial",
      sorter: (a, b) => a.nombre_comercial.localeCompare(b.nombre_comercial),
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: "Usuario",
      key: "usuario",
      sorter: (a, b) =>
        (usuarioDe(a.id_usuario)?.nombres ?? "").localeCompare(
          usuarioDe(b.id_usuario)?.nombres ?? "",
        ),
      render: (_: unknown, record: Asesor) => {
        const usuario = usuarioDe(record.id_usuario);
        return usuario ? (
          <span>{usuario.nombres}</span>
        ) : (
          <span style={{ color: "#bfbfbf" }} aria-label="Sin usuario vinculado">
            Sin usuario
          </span>
        );
      },
    },
    {
      title: "Meta Mensual",
      dataIndex: "meta_ventas_mensual",
      key: "meta_ventas_mensual",
      sorter: (a, b) => (a.meta_ventas_mensual ?? 0) - (b.meta_ventas_mensual ?? 0),
      render: (val: number) => <span>${(val ?? 0).toLocaleString()}</span>,
    },
    {
      title: "Ventas",
      key: "ventas",
      sorter: (a, b) => getVentasAsesor(a.id_asesor).length - getVentasAsesor(b.id_asesor).length,
      render: (_: unknown, record: Asesor) => {
        const ventasAsesor = getVentasAsesor(record.id_asesor);
        const totalVendido = ventasAsesor.reduce((sum, venta) => sum + venta.precio_final, 0);
        return (
          <Tooltip title="Abre el detalle del asesor para ver cada venta">
            <Button type="link" onClick={() => openModal("view", record)} style={{ padding: 0, height: "auto" }}>
              {ventasAsesor.length} ventas · ${totalVendido.toLocaleString()}
            </Button>
          </Tooltip>
        );
      },
    },
    {
      title: "Rendimiento",
      key: "rendimiento",
      render: (_: unknown, record: Asesor) => {
        const ventasMes = getVentasMes(record.id_asesor);
        const meta = record.meta_ventas_mensual ?? 1;
        const porcentaje = Math.min(Math.round((ventasMes / meta) * 100), 100);
        const color = porcentaje >= 80 ? "#52c41a" : porcentaje >= 50 ? "#faad14" : "#ff4d4f";
        return (
          <Tooltip title={`$${ventasMes.toLocaleString()} / $${meta.toLocaleString()}`}>
            <Progress
              percent={porcentaje}
              size="small"
              strokeColor={color}
              format={() => `${porcentaje}%`}
            />
          </Tooltip>
        );
      },
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: Object.entries(estadoConfig).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value, record) => record.estado === value,
      render: (estado: AsesorEstado) => {
        const config = estadoConfig[estado] ?? estadoConfig.activo;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 190,
      render: (_: unknown, record: Asesor) => (
        <Space size={4}>
          <Tooltip title={record.id_usuario ? "Vincular otro usuario" : "Vincular usuario"}>
            <Button
              type="text"
              icon={<UserSwitchOutlined />}
              style={{ color: record.id_usuario ? "#52c41a" : "#1677ff" }}
              onClick={() => abrirVinculacion(record)}
            />
          </Tooltip>
          <Tooltip title="Ver">
            <Button
              type="text"
              icon={<EyeOutlined />}
              style={{ color: "#1677ff" }}
              onClick={() => openModal("view", record)}
            />
          </Tooltip>
          <Tooltip title="Editar">
            <Button
              type="text"
              icon={<EditOutlined />}
              style={{ color: "#faad14" }}
              onClick={() => openModal("edit", record)}
            />
          </Tooltip>
          <Tooltip title="Eliminar">
            <Button
              type="text"
              icon={<DeleteOutlined />}
              style={{ color: "#ff4d4f" }}
              onClick={() => openModal("delete", record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <PageToolbar
        title="Asesores"
        subtitle="Gestion de asesores comerciales"
        search={{ value: searchText, onChange: setSearchText, placeholder: "Buscar asesor..." }}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Nuevo Asesor
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Total</span>}
              value={stats.total}
              valueStyle={{ fontWeight: 700, fontSize: 22 }}
              prefix={<UserOutlined style={{ color: "#1677ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #b7eb8f" }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Activos</span>}
              value={stats.activos}
              valueStyle={{ fontWeight: 700, fontSize: 18, color: "#52c41a" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffccc7" }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Inactivos</span>}
              value={stats.inactivos}
              valueStyle={{ fontWeight: 700, fontSize: 18, color: "#ff4d4f" }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffe58f" }}>
            <Statistic
              title={<span style={{ fontSize: 12 }}>Meta Total</span>}
              value={stats.metaTotal}
              valueStyle={{ fontWeight: 700, fontSize: 18, color: "#faad14" }}
              prefix={<TrophyOutlined />}
              formatter={(val) => `$${(val as number).toLocaleString()}`}
            />
          </Card>
        </Col>
      </Row>

      <DataTable<Asesor>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_asesor"
        loading={isLoading}
      />

      {/* View Modal */}
      <Modal
        title="Detalle del Asesor"
        open={modal.visible && modal.type === "view"}
        onCancel={closeModal}
        footer={[
          <Button key="close" onClick={closeModal}>
            Cerrar
          </Button>,
        ]}
        width={600}
      >
        {modal.record && (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Codigo">
                <Tag color="blue">{modal.record.codigo}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag color={estadoConfig[modal.record.estado]?.color}>
                  {estadoConfig[modal.record.estado]?.label}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Nombre" span={2}>
                {modal.record.nombre_comercial}
              </Descriptions.Item>
              <Descriptions.Item label="Meta Mensual" span={2}>
                ${(modal.record.meta_ventas_mensual ?? 0).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>
            <h3 style={{ margin: "20px 0 8px" }}>Ventas registradas</h3>
            <List
              size="small"
              bordered
              dataSource={getVentasAsesor(modal.record.id_asesor)}
              locale={{ emptyText: "Este asesor todavía no tiene ventas registradas" }}
              renderItem={(venta) => {
                const lote = loteDe(venta.id_lote);
                const estadoLote = lote?.estado.replaceAll("_", " ");
                return (
                  <List.Item>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, width: "100%", flexWrap: "wrap" }}>
                      <span>
                        Venta #{venta.id_venta}
                        {" · "}
                        {lote?.numero_lote ?? `Lote #${venta.id_lote}`}
                        {venta.created_at ? ` · ${formatDate(venta.created_at)}` : ""}
                        {" · "}
                        <Tag
                          color={lote?.estado === "vendido" ? "green" : "default"}
                          style={{ marginInlineEnd: 4 }}
                        >
                          {lote ? `Lote ${estadoLote}` : "Lote sin datos"}
                        </Tag>
                        <Tag
                          color={venta.estado === "completada" ? "blue" : venta.estado === "cancelada" ? "red" : "orange"}
                          style={{ marginInlineEnd: 0 }}
                        >
                          {venta.estado === "completada"
                            ? "Pagada"
                            : venta.estado === "cancelada"
                              ? "Venta cancelada"
                              : "Pago pendiente"}
                        </Tag>
                      </span>
                      <strong>${venta.precio_final.toLocaleString()}</strong>
                    </div>
                  </List.Item>
                );
              }}
            />
          </>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Editar Asesor"
        open={modal.visible && modal.type === "edit"}
        onCancel={closeModal}
        onOk={handleEdit}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="codigo"
            label="Codigo"
            rules={[
              { required: true, message: "Ingrese el codigo" },
              // Si no se modifica el codigo original se acepta aunque no cumpla el formato actual.
              () => ({
                validator(_, value) {
                  const actual = typeof value === "string" ? value.trim().toUpperCase() : "";
                  const original = (modal.record?.codigo ?? "").trim().toUpperCase();
                  if (actual === original || /^[A-Z]{2}-\d{3}$/.test(actual)) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("Formato: AS-001"));
                },
              }),
            ]}
          >
            <Input placeholder="Ej: AS-001" style={{ textTransform: "uppercase" }} />
          </Form.Item>
          <Form.Item
            name="nombre_comercial"
            label="Nombre"
            rules={[{ required: true, message: "Ingrese el nombre" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item name="meta_ventas_mensual" label="Meta Ventas Mensual">
            <InputNumber style={{ width: "100%" }} min={0} step={100} prefix="$" />
          </Form.Item>
          <Form.Item name="estado" label="Estado">
            <Select
              options={[
                { value: "activo", label: "Activo" },
                { value: "inactivo", label: "Inactivo" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        title="Eliminar Asesor"
        open={modal.visible && modal.type === "delete"}
        onCancel={closeModal}
        onOk={handleDelete}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p style={{ marginTop: 16 }}>
          ¿Eliminar asesor <strong>{modal.record?.nombre_comercial}</strong>?
        </p>
      </Modal>

      {/* Modal de vinculación usuario ↔ asesor */}
      <Modal
        title="Vincular usuario"
        open={vinculacion !== null}
        onCancel={() => {
          setVinculacion(null);
          setIdUsuarioVincular(null);
        }}
        onOk={handleVincular}
        okText={idUsuarioVincular ? "Guardar vínculo" : "Desvincular"}
        cancelText="Cancelar"
        confirmLoading={vinculando}
        okButtonProps={{ disabled: !idUsuarioVincular && !vinculacion?.id_usuario }}
        width={520}
      >
        {vinculacion && (
          <div style={{ marginTop: 16 }}>
            <p>
              Asesor <strong>{vinculacion.nombre_comercial}</strong> (
              <Tag color="blue">{vinculacion.codigo}</Tag>)
            </p>
            <Form layout="vertical">
              <Form.Item
                label="Usuario"
                extra="Se usa para cargar prospectos y ventas con este asesor. Deje el campo vacío para desvincular."
              >
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Seleccionar usuario"
                  value={idUsuarioVincular}
                  onChange={(value) => setIdUsuarioVincular(value ?? null)}
                  options={opcionesUsuarios}
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>

      {/* Create Modal */}
      <Modal
        title="Nuevo Asesor"
        open={createModalOpen}
        onCancel={() => {
          setCreateModalOpen(false);
          createForm.resetFields();
        }}
        onOk={handleCreate}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="codigo"
            label="Codigo"
            rules={[
              { required: true, message: "Ingrese el codigo" },
              { pattern: /^[A-Z]{2}-\d{3}$/, message: "Formato: AS-001" },
            ]}
          >
            <Input placeholder="AS-001" style={{ textTransform: "uppercase" }} />
          </Form.Item>
          <Form.Item
            name="nombre_comercial"
            label="Nombre"
            rules={[{ required: true, message: "Ingrese el nombre" }]}
          >
            <Input placeholder="Nombre del asesor" />
          </Form.Item>
          <Form.Item name="meta_ventas_mensual" label="Meta Ventas Mensual" initialValue={0}>
            <InputNumber style={{ width: "100%" }} min={0} step={100} prefix="$" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
