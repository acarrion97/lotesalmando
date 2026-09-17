import { useState, useMemo } from "react";
import { Card, Button, Space, Input, Tag, Typography, Modal, Form, Select, Descriptions, message, Row, Col, Statistic, Tooltip } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, UserOutlined, WarningOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useProspectos } from "@/presentation/hooks";
import type { Prospecto, ProspectoEstado } from "@/domain/prospecto/entities/Prospecto";
import { getContainer } from "@/infrastructure/container";
import { prospectoSchema } from "@/presentation/validations";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";

const { Text } = Typography;

const estadoConfig: Record<ProspectoEstado, { color: string; label: string }> = {
  nuevo: { color: "blue", label: "Nuevo" },
  contactado: { color: "cyan", label: "Contactado" },
  interesado: { color: "green", label: "Interesado" },
  negociacion: { color: "orange", label: "Negociacion" },
  reserva: { color: "purple", label: "Reserva" },
  perdido: { color: "red", label: "Perdido" },
};

const pipelineEtapas: ProspectoEstado[] = ["nuevo", "contactado", "interesado", "negociacion", "reserva", "perdido"];

interface ModalState {
  type: "view" | "edit" | "delete" | null;
  visible: boolean;
  record: Prospecto | null;
}

export function ProspectosPage() {
  const { data: prospectos, isLoading } = useProspectos();
  const [searchText, setSearchText] = useState("");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const container = getContainer();

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["prospectos"] });

  const filteredData = useMemo(() => {
    if (!prospectos) return [];
    return prospectos.filter((p) =>
      p.nombres.toLowerCase().includes(searchText.toLowerCase()) ||
      (p.email ?? "").toLowerCase().includes(searchText.toLowerCase())
    );
  }, [prospectos, searchText]);

  const pipelineStats = useMemo(() => {
    if (!prospectos) return {};
    const stats: Record<string, number> = {};
    for (const etapa of pipelineEtapas) {
      stats[etapa] = prospectos.filter((p) => p.estado === etapa).length;
    }
    return stats;
  }, [prospectos]);

  const sinSeguimiento = useMemo(() => {
    if (!prospectos) return [];
    const now = new Date();
    return prospectos.filter((p) => {
      if (!p.fecha_ultimo_seguimiento) return true;
      const diff = now.getTime() - new Date(p.fecha_ultimo_seguimiento).getTime();
      return diff > 48 * 60 * 60 * 1000;
    });
  }, [prospectos]);

  const openModal = (type: "view" | "edit" | "delete", record: Prospecto) => {
    setModal({ type, visible: true, record });
    if (type === "edit") editForm.setFieldsValue({ nombres: record.nombres, email: record.email, telefono: record.telefono, origen: record.origen, estado: record.estado, notas: record.notas });
  };

  const closeModal = () => { setModal({ type: null, visible: false, record: null }); editForm.resetFields(); };

  const handleEdit = async () => {
    if (!modal.record) return;
    try {
      const values = await editForm.validateFields();
      const parsed = prospectoSchema.partial().parse(values);
      await container.updateProspecto.execute(modal.record.id_prospecto, parsed);
      await refresh();
      messageApi.success("Prospecto actualizado");
      closeModal();
    } catch (error) {
      if (error instanceof Error) messageApi.error(error.message);
      else messageApi.error("Error al actualizar");
    }
  };

  const handleDelete = async () => {
    if (!modal.record) return;
    try {
      await container.deleteProspecto.execute(modal.record.id_prospecto);
      await refresh();
      messageApi.success("Prospecto eliminado");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Error al eliminar");
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      const parsed = prospectoSchema.parse(values);
      await container.createProspecto.execute({ ...parsed, id_empresa: 1, id_asesor: null, fecha_ultimo_seguimiento: null });
      await refresh();
      messageApi.success("Prospecto creado");
      setCreateModalOpen(false);
      createForm.resetFields();
    } catch (error) {
      if (error instanceof Error) messageApi.error(error.message);
      else messageApi.error("Error al crear");
    }
  };

  const columns: TableColumnType<Prospecto>[] = [
    {
      title: "Nombre",
      dataIndex: "nombres",
      key: "nombres",
      sorter: (a, b) => a.nombres.localeCompare(b.nombres),
      render: (text: string) => <span style={{ fontWeight: 600 }}>{text}</span>,
    },
    {
      title: "Email",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "Telefono",
      dataIndex: "telefono",
      key: "telefono",
    },
    {
      title: "Origen",
      dataIndex: "origen",
      key: "origen",
      render: (text: string) => <Tag>{text}</Tag>,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: pipelineEtapas.map((e) => ({ text: estadoConfig[e].label, value: e })),
      onFilter: (value, record) => record.estado === value,
      render: (estado: ProspectoEstado) => {
        const config = estadoConfig[estado] ?? estadoConfig.nuevo;
        return <Tag color={config.color}>{config.label}</Tag>;
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 150,
      render: (_: unknown, record: Prospecto) => (
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
      <PageToolbar
        title="Prospectos"
        subtitle="Pipeline de ventas y seguimiento"
        search={{ value: searchText, onChange: setSearchText, placeholder: "Buscar prospecto..." }}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)}>
            Nuevo Prospecto
          </Button>
        }
      />

      {/* Pipeline Visual */}
      <Row gutter={[8, 8]} style={{ marginBottom: 24 }}>
        {pipelineEtapas.map((etapa) => {
          const config = estadoConfig[etapa];
          const count = pipelineStats[etapa] ?? 0;
          return (
            <Col key={etapa} xs={8} sm={4}>
              <Card size="small" style={{ borderTop: `3px solid ${config.color === "blue" ? "#1677ff" : config.color === "cyan" ? "#13c2c2" : config.color === "green" ? "#52c41a" : config.color === "orange" ? "#faad14" : config.color === "purple" ? "#722ed1" : "#ff4d4f"}`, textAlign: "center" }}>
                <Statistic title={<span style={{ fontSize: 11 }}>{config.label}</span>} value={count} valueStyle={{ fontWeight: 700, fontSize: 20 }} />
              </Card>
            </Col>
          );
        })}
      </Row>

      {/* Alerta sin seguimiento */}
      {sinSeguimiento.length > 0 && (
        <Card size="small" style={{ marginBottom: 16, border: "1px solid #ffccc7", background: "#fff2f0" }}>
          <Space>
            <WarningOutlined style={{ color: "#ff4d4f", fontSize: 16 }} />
            <Text style={{ color: "#ff4d4f" }}>
              <strong>{sinSeguimiento.length}</strong> prospecto{sinSeguimiento.length > 1 ? "s" : ""} sin seguimiento en 48h
            </Text>
          </Space>
        </Card>
      )}

      <DataTable<Prospecto>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_prospecto"
        loading={isLoading}
      />

      {/* View Modal */}
      <Modal
        title="Detalle del Prospecto"
        open={modal.visible && modal.type === "view"}
        onCancel={closeModal}
        footer={[<Button key="close" onClick={closeModal}>Cerrar</Button>]}
        width={600}
      >
        {modal.record && (
          <div>
            <Descriptions bordered column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Nombre" span={2}>{modal.record.nombres}</Descriptions.Item>
              <Descriptions.Item label="Email">{modal.record.email || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Telefono">{modal.record.telefono || "N/A"}</Descriptions.Item>
              <Descriptions.Item label="Origen">{modal.record.origen}</Descriptions.Item>
              <Descriptions.Item label="Estado"><Tag color={estadoConfig[modal.record.estado]?.color}>{estadoConfig[modal.record.estado]?.label}</Tag></Descriptions.Item>
              <Descriptions.Item label="Notas" span={2}>{modal.record.notas || "Sin notas"}</Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Editar Prospecto"
        open={modal.visible && modal.type === "edit"}
        onCancel={closeModal}
        onOk={handleEdit}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombres" label="Nombres" rules={[{ required: true, message: "Ingrese el nombre" }]}>
            <Input prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item name="email" label="Email"><Input /></Form.Item>
          <Form.Item name="telefono" label="Telefono"><Input /></Form.Item>
          <Form.Item name="origen" label="Origen">
            <Select options={[{ value: "directo", label: "Directo" }, { value: "referido", label: "Referido" }, { value: "web", label: "Web" }, { value: "publicidad", label: "Publicidad" }]} />
          </Form.Item>
          <Form.Item name="estado" label="Estado">
            <Select options={pipelineEtapas.map((e) => ({ value: e, label: estadoConfig[e].label }))} />
          </Form.Item>
          <Form.Item name="notas" label="Notas"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        title="Eliminar Prospecto"
        open={modal.visible && modal.type === "delete"}
        onCancel={closeModal}
        onOk={handleDelete}
        okText="Eliminar"
        cancelText="Cancelar"
        okButtonProps={{ danger: true }}
      >
        <p style={{ marginTop: 16 }}>¿Eliminar prospecto <strong>{modal.record?.nombres}</strong>?</p>
      </Modal>

      {/* Create Modal */}
      <Modal
        title="Nuevo Prospecto"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={handleCreate}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="nombres" label="Nombres" rules={[{ required: true, message: "Ingrese el nombre" }]}>
            <Input prefix={<UserOutlined />} placeholder="Nombre completo" />
          </Form.Item>
          <Form.Item name="email" label="Email"><Input placeholder="email@ejemplo.com" /></Form.Item>
          <Form.Item name="telefono" label="Telefono"><Input placeholder="0991234567" /></Form.Item>
          <Form.Item name="origen" label="Origen" initialValue="directo">
            <Select options={[{ value: "directo", label: "Directo" }, { value: "referido", label: "Referido" }, { value: "web", label: "Web" }, { value: "publicidad", label: "Publicidad" }]} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
