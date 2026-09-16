import { useState, useMemo } from "react";
import { Table, Card, Button, Space, Input, Tag, Typography, Modal, Form, InputNumber, Select, Descriptions, message, Row, Col, Statistic, Progress, Tooltip } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, SearchOutlined, EditOutlined, DeleteOutlined, EyeOutlined, TrophyOutlined, UserOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useAsesores, useVentas } from "@/presentation/hooks";
import type { Asesor, AsesorEstado } from "@/domain/asesor/entities/Asesor";
import { getContainer } from "@/infrastructure/container";
import { asesorSchema } from "@/presentation/validations";
import { useEmpresa } from "@/presentation/providers/EmpresaProvider";

const { Title, Text } = Typography;

const estadoConfig: Record<AsesorEstado, { color: string; label: string }> = {
  activo: { color: "green", label: "Activo" },
  inactivo: { color: "red", label: "Inactivo" },
};

interface ModalState {
  type: "view" | "edit" | "delete" | null;
  visible: boolean;
  record: Asesor | null;
}

export function AsesoresPage() {
  const { data: asesores, isLoading } = useAsesores();
  const { data: ventas } = useVentas();
  const { empresaActual } = useEmpresa();
  const [searchText, setSearchText] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const container = getContainer();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["asesores"] });

  const filteredData = useMemo(() => {
    if (!asesores) return [];
    return asesores.filter((a) =>
      a.nombre_comercial.toLowerCase().includes(searchText.toLowerCase()) ||
      a.codigo.toLowerCase().includes(searchText.toLowerCase())
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
    return ventas.filter((v) => v.id_usuario === asesorId).reduce((sum, v) => sum + v.precio_final, 0);
  };

  const openModal = (type: "view" | "edit" | "delete", record: Asesor) => {
    setModal({ type, visible: true, record });
    if (type === "edit") editForm.setFieldsValue({ codigo: record.codigo, nombre_comercial: record.nombre_comercial, meta_ventas_mensual: record.meta_ventas_mensual, estado: record.estado });
  };

  const closeModal = () => { setModal({ type: null, visible: false, record: null }); editForm.resetFields(); };

  const handleEdit = async () => {
    if (!modal.record) return;
    try {
      const values = await editForm.validateFields();
      const parsed = asesorSchema.partial().parse(values);
      await container.updateAsesor.execute(modal.record.id_asesor, parsed);
      await refresh();
      messageApi.success("Asesor actualizado");
      closeModal();
    } catch (error) {
      if (error instanceof Error) messageApi.error(error.message);
      else messageApi.error("Error");
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
      await container.createAsesor.execute({ ...parsed, id_empresa: empresaActual.id_empresa, id_usuario: null });
      await refresh();
      messageApi.success("Asesor creado");
      setCreateModalOpen(false);
      createForm.resetFields();
    } catch (error) {
      if (error instanceof Error) messageApi.error(error.message);
      else messageApi.error("Error");
    }
  };

  const columns: TableColumnType<Asesor>[] = [
    {
      title: "Codigo",
      dataIndex: "codigo",
      key: "codigo",
      sorter: (a, b) => a.codigo.localeCompare(b.codigo),
      render: (text: string) => <Tag color="blue" style={{ fontWeight: 600 }}>{text}</Tag>,
    },
    {
      title: "Nombre",
      dataIndex: "nombre_comercial",
      key: "nombre_comercial",
      sorter: (a, b) => a.nombre_comercial.localeCompare(b.nombre_comercial),
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: "Meta Mensual",
      dataIndex: "meta_ventas_mensual",
      key: "meta_ventas_mensual",
      sorter: (a, b) => (a.meta_ventas_mensual ?? 0) - (b.meta_ventas_mensual ?? 0),
      render: (val: number) => <span>${(val ?? 0).toLocaleString()}</span>,
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
            <Progress percent={porcentaje} size="small" strokeColor={color} format={() => `${porcentaje}%`} />
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
      width: 150,
      render: (_: unknown, record: Asesor) => (
        <Space size={4}>
          <Tooltip title="Ver"><Button type="text" icon={<EyeOutlined />} style={{ color: "#1677ff" }} onClick={() => openModal("view", record)} /></Tooltip>
          <Tooltip title="Editar"><Button type="text" icon={<EditOutlined />} style={{ color: "#faad14" }} onClick={() => openModal("edit", record)} /></Tooltip>
          <Tooltip title="Eliminar"><Button type="text" icon={<DeleteOutlined />} style={{ color: "#ff4d4f" }} onClick={() => openModal("delete", record)} /></Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Asesores</Title>
          <Text type="secondary">Gestion de asesores comerciales</Text>
        </div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>Nuevo Asesor</Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Total</span>} value={stats.total} valueStyle={{ fontWeight: 700, fontSize: 22 }} prefix={<UserOutlined style={{ color: "#1677ff" }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #b7eb8f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Activos</span>} value={stats.activos} valueStyle={{ fontWeight: 700, fontSize: 18, color: "#52c41a" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffccc7" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Inactivos</span>} value={stats.inactivos} valueStyle={{ fontWeight: 700, fontSize: 18, color: "#ff4d4f" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffe58f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Meta Total</span>} value={stats.metaTotal} valueStyle={{ fontWeight: 700, fontSize: 18, color: "#faad14" }} prefix={<TrophyOutlined />} formatter={(val) => `$${(val as number).toLocaleString()}`} />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input placeholder="Buscar asesor..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 300, borderRadius: 8 }} allowClear />
        </div>
        <Table<Asesor>
          columns={columns}
          dataSource={filteredData}
          rowKey="id_asesor"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} registros` }}
        />
      </Card>

      {/* View Modal */}
      <Modal title="Detalle del Asesor" open={modal.visible && modal.type === "view"} onCancel={closeModal} footer={[<Button key="close" onClick={closeModal}>Cerrar</Button>]} width={500}>
        {modal.record && (
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label="Codigo"><Tag color="blue">{modal.record.codigo}</Tag></Descriptions.Item>
            <Descriptions.Item label="Estado"><Tag color={estadoConfig[modal.record.estado]?.color}>{estadoConfig[modal.record.estado]?.label}</Tag></Descriptions.Item>
            <Descriptions.Item label="Nombre" span={2}>{modal.record.nombre_comercial}</Descriptions.Item>
            <Descriptions.Item label="Meta Mensual" span={2}>${(modal.record.meta_ventas_mensual ?? 0).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal title="Editar Asesor" open={modal.visible && modal.type === "edit"} onCancel={closeModal} onOk={handleEdit} okText="Guardar" cancelText="Cancelar">
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="codigo" label="Codigo" rules={[{ required: true, message: "Ingrese el codigo" }]}>
            <Input placeholder="Ej: AS-001" />
          </Form.Item>
          <Form.Item name="nombre_comercial" label="Nombre" rules={[{ required: true, message: "Ingrese el nombre" }]}>
            <Input />
          </Form.Item>
          <Form.Item name="meta_ventas_mensual" label="Meta Ventas Mensual">
            <InputNumber style={{ width: "100%" }} min={0} step={100} prefix="$" />
          </Form.Item>
          <Form.Item name="estado" label="Estado">
            <Select options={[{ value: "activo", label: "Activo" }, { value: "inactivo", label: "Inactivo" }]} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal title="Eliminar Asesor" open={modal.visible && modal.type === "delete"} onCancel={closeModal} onOk={handleDelete} okText="Eliminar" cancelText="Cancelar" okButtonProps={{ danger: true }}>
        <p style={{ marginTop: 16 }}>¿Eliminar asesor <strong>{modal.record?.nombre_comercial}</strong>?</p>
      </Modal>

      {/* Create Modal */}
      <Modal title="Nuevo Asesor" open={createModalOpen} onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }} onOk={handleCreate} okText="Crear" cancelText="Cancelar">
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="codigo" label="Codigo" rules={[{ required: true, message: "Ingrese el codigo" }, { pattern: /^[A-Z]{2}-\d{3}$/, message: "Formato: AS-001" }]}>
            <Input placeholder="AS-001" style={{ textTransform: "uppercase" }} />
          </Form.Item>
          <Form.Item name="nombre_comercial" label="Nombre" rules={[{ required: true, message: "Ingrese el nombre" }]}>
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
