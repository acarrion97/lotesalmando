import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Table,
  Card,
  Button,
  Space,
  Input,
  Tag,
  Typography,
  Row,
  Col,
  Statistic,
  Tooltip,
  Dropdown,
  Modal,
  Form,
  InputNumber,
  Select,
  Descriptions,
  message,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  HomeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  MoreOutlined,
} from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useLotes, useManzanas } from "@/presentation/hooks";
import type { Lote, LoteEstado } from "@/domain/lote/entities/Lote";
import { getContainer } from "@/infrastructure/container";

const { Title, Text } = Typography;

const estadoConfig: Record<LoteEstado, { color: string; bg: string; border: string; icon: React.ReactNode }> = {
  disponible: {
    color: "#52c41a",
    bg: "#f6ffed",
    border: "#b7eb8f",
    icon: <CheckCircleOutlined />,
  },
  reservado: {
    color: "#faad14",
    bg: "#fffbe6",
    border: "#ffe58f",
    icon: <ClockCircleOutlined />,
  },
  vendido: {
    color: "#ff4d4f",
    bg: "#fff2f0",
    border: "#ffccc7",
    icon: <StopOutlined />,
  },
  en_negociacion: {
    color: "#1677ff",
    bg: "#e6f4ff",
    border: "#91caff",
    icon: <ClockCircleOutlined />,
  },
  bloqueado: {
    color: "#8c8c8c",
    bg: "#f5f5f5",
    border: "#d9d9d9",
    icon: <StopOutlined />,
  },
  no_disponible: {
    color: "#8c8c8c",
    bg: "#f5f5f5",
    border: "#d9d9d9",
    icon: <StopOutlined />,
  },
};

interface ModalState {
  type: "view" | "edit" | "delete" | null;
  visible: boolean;
  record: Lote | null;
}

function LoteGridCard({ lote, onAction }: { lote: Lote; onAction: (type: "view" | "edit" | "delete", record: Lote) => void }) {
  const config = estadoConfig[lote.estado] ?? estadoConfig.disponible;

  return (
    <Card
      hoverable
      style={{
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${config.border}`,
        transition: "all 0.3s",
      }}
      styles={{
        body: { padding: 0 },
      }}
    >
      <div
        style={{
          background: config.bg,
          padding: "16px 20px",
          borderBottom: `1px solid ${config.border}`,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: config.color,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 18,
            }}
          >
            <HomeOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 18, color: "#1a1a1a" }}>{lote.numero_lote}</div>
            <div style={{ color: "#8c8c8c", fontSize: 12 }}>Manzana {lote.id_manzana}</div>
          </div>
        </div>
        <Tag
          color={config.color}
          style={{
            margin: 0,
            fontWeight: 600,
            fontSize: 11,
            padding: "2px 10px",
            borderRadius: 12,
          }}
        >
          {(lote.estado ?? "sin estado").toUpperCase()}
        </Tag>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ color: "#8c8c8c", fontSize: 12, marginBottom: 4 }}>Precio de Lista</div>
            <div style={{ fontWeight: 700, fontSize: 20, color: "#1a1a1a" }}>
              ${lote.precio_lista.toLocaleString()}
            </div>
          </div>
          <Dropdown
            menu={{
              items: [
                { key: "ver", icon: <EyeOutlined />, label: "Ver detalle", onClick: () => onAction("view", lote) },
                { key: "editar", icon: <EditOutlined />, label: "Editar", onClick: () => onAction("edit", lote) },
                { type: "divider" },
                { key: "eliminar", icon: <DeleteOutlined />, label: "Eliminar", danger: true, onClick: () => onAction("delete", lote) },
              ],
            }}
            trigger={["click"]}
          >
            <Button type="text" icon={<MoreOutlined />} style={{ color: "#8c8c8c" }} />
          </Dropdown>
        </div>
      </div>
    </Card>
  );
}

export function LotesPage() {
  const { data: lotes, isLoading } = useLotes();
  const { data: manzanas } = useManzanas();
  const [searchText, setSearchText] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [modal, setModal] = useState<ModalState>({ type: null, visible: false, record: null });
  const [editForm] = Form.useForm();
  const [createForm] = Form.useForm();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const container = getContainer();

  const refreshLotes = () => queryClient.invalidateQueries({ queryKey: ["lotes"] });

  const stats = useMemo(() => {
    if (!lotes) return { total: 0, disponibles: 0, reservados: 0, vendidos: 0, valorTotal: 0 };
    return {
      total: lotes.length,
      disponibles: lotes.filter((l) => l.estado === "disponible").length,
      reservados: lotes.filter((l) => l.estado === "reservado").length,
      vendidos: lotes.filter((l) => l.estado === "vendido").length,
      valorTotal: lotes.reduce((sum, l) => sum + l.precio_lista, 0),
    };
  }, [lotes]);

  const filteredData = useMemo(() => {
    if (!lotes) return [];
    return lotes.filter(
      (l) =>
        l.numero_lote.toLowerCase().includes(searchText.toLowerCase()) ||
        l.estado.toLowerCase().includes(searchText.toLowerCase()),
    );
  }, [lotes, searchText]);

  const openModal = (type: "view" | "edit" | "delete", record: Lote) => {
    setModal({ type, visible: true, record });
    if (type === "edit") {
      editForm.setFieldsValue({ numero_lote: record.numero_lote, precio_lista: record.precio_lista, estado: record.estado });
    }
  };

  const closeModal = () => {
    setModal({ type: null, visible: false, record: null });
    editForm.resetFields();
  };

  const handleEdit = async () => {
    if (!modal.record) return;

    try {
      const values = await editForm.validateFields();
      await container.updateLote.execute(modal.record.id_lote, values);
      await refreshLotes();
      messageApi.success("Lote actualizado correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo actualizar el lote");
    }
  };

  const handleDelete = async () => {
    if (!modal.record) return;

    try {
      await container.deleteLote.execute(modal.record.id_lote);
      await refreshLotes();
      messageApi.success("Lote eliminado correctamente");
      closeModal();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo eliminar el lote");
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await container.createLote.execute(values);
      await refreshLotes();
      messageApi.success("Lote creado correctamente");
      setCreateModalOpen(false);
      createForm.resetFields();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo crear el lote");
    }
  };

  const columns: TableColumnType<Lote>[] = [
    {
      title: "Numero",
      dataIndex: "numero_lote",
      key: "numero_lote",
      sorter: (a, b) => a.numero_lote.localeCompare(b.numero_lote),
      render: (text: string) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "#f0f5ff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#1677ff",
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            <HomeOutlined />
          </div>
          <span style={{ fontWeight: 600 }}>{text}</span>
        </div>
      ),
    },
    {
      title: "Manzana",
      dataIndex: "id_manzana",
      key: "id_manzana",
      sorter: (a, b) => a.id_manzana - b.id_manzana,
      filters: manzanas
        ? Array.from(new Set(manzanas.map((m) => m.id_manzana))).map((id) => ({ text: `Mz. ${id}`, value: id }))
        : [],
      onFilter: (value, record) => record.id_manzana === value,
      render: (id: number) => (
        <Tag style={{ borderRadius: 6, fontWeight: 500 }}>Mz. {id}</Tag>
      ),
    },
    {
      title: "Precio Lista",
      dataIndex: "precio_lista",
      key: "precio_lista",
      sorter: (a, b) => a.precio_lista - b.precio_lista,
      render: (precio: number) => (
        <span style={{ fontWeight: 600, color: "#1a1a1a" }}>${precio.toLocaleString()}</span>
      ),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: [
        { text: "Disponible", value: "disponible" },
        { text: "Reservado", value: "reservado" },
        { text: "En Negociacion", value: "en_negociacion" },
        { text: "Vendido", value: "vendido" },
        { text: "Bloqueado", value: "bloqueado" },
        { text: "No Disponible", value: "no_disponible" },
      ],
      onFilter: (value, record) => record.estado === value,
      render: (estado: LoteEstado) => {
        const config = estadoConfig[estado] ?? estadoConfig.disponible;
        return (
          <Tag
            color={config.color}
            style={{
              fontWeight: 600,
              fontSize: 11,
              padding: "2px 10px",
              borderRadius: 12,
              margin: 0,
            }}
          >
            {config.icon} {(estado ?? "sin estado").toUpperCase()}
          </Tag>
        );
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 200,
      render: (_: unknown, record: Lote) => (
        <Space size={4}>
          <Tooltip title="Ver detalle">
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
          <Popconfirm
            title="Eliminar lote"
            description="¿Estás seguro que deseas eliminar este lote?"
            onConfirm={() => {
              handleDelete();
            }}
            okText="Eliminar"
            cancelText="Cancelar"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Eliminar">
              <Button
                type="text"
                icon={<DeleteOutlined />}
                style={{ color: "#ff4d4f" }}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {contextHolder}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          Lotes
        </Title>
        <Text type="secondary">Gestion de lotes por manzana y proyecto</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              borderRadius: 10,
              border: "1px solid #f0f0f0",
            }}
          >
            <Statistic
              title={<span style={{ fontSize: 12 }}>Total Lotes</span>}
              value={stats.total}
              valueStyle={{ fontWeight: 700, fontSize: 24 }}
              prefix={<HomeOutlined style={{ color: "#1677ff" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              borderRadius: 10,
              border: "1px solid #b7eb8f",
              background: "#fafafa",
            }}
          >
            <Statistic
              title={<span style={{ fontSize: 12 }}>Disponibles</span>}
              value={stats.disponibles}
              valueStyle={{ fontWeight: 700, fontSize: 24, color: "#52c41a" }}
              prefix={<CheckCircleOutlined style={{ color: "#52c41a" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              borderRadius: 10,
              border: "1px solid #ffe58f",
              background: "#fafafa",
            }}
          >
            <Statistic
              title={<span style={{ fontSize: 12 }}>Reservados</span>}
              value={stats.reservados}
              valueStyle={{ fontWeight: 700, fontSize: 24, color: "#faad14" }}
              prefix={<ClockCircleOutlined style={{ color: "#faad14" }} />}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card
            size="small"
            style={{
              borderRadius: 10,
              border: "1px solid #ffccc7",
              background: "#fafafa",
            }}
          >
            <Statistic
              title={<span style={{ fontSize: 12 }}>Vendidos</span>}
              value={stats.vendidos}
              valueStyle={{ fontWeight: 700, fontSize: 24, color: "#ff4d4f" }}
              prefix={<StopOutlined style={{ color: "#ff4d4f" }} />}
            />
          </Card>
        </Col>
      </Row>

      <Card
        style={{
          borderRadius: 12,
          border: "1px solid #f0f0f0",
        }}
        styles={{
          body: { padding: 0 },
        }}
      >
        <div
          style={{
            padding: "16px 24px",
            borderBottom: "1px solid #f0f0f0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <Input
            placeholder="Buscar lote..."
            prefix={<SearchOutlined style={{ color: "#bfbfbf" }} />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: "100%", maxWidth: 280, borderRadius: 8 }}
            allowClear
          />
          <Space size={8} wrap>
            <div
              style={{
                display: "flex",
                border: "1px solid #d9d9d9",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <Button
                type={viewMode === "table" ? "primary" : "text"}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode("table")}
                style={{ borderRadius: 0, border: "none" }}
              />
              <Button
                type={viewMode === "grid" ? "primary" : "text"}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode("grid")}
                style={{ borderRadius: 0, border: "none" }}
              />
            </div>
            <Button type="primary" icon={<PlusOutlined />} style={{ borderRadius: 8, fontWeight: 600 }} onClick={() => setCreateModalOpen(true)}>
              Nuevo Lote
            </Button>
          </Space>
        </div>

        {viewMode === "table" ? (
          <Table<Lote>
            columns={columns}
            dataSource={filteredData}
            rowKey="id_lote"
            loading={isLoading}
            scroll={{ x: 900 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              pageSizeOptions: ["10", "20", "50"],
              showTotal: (total) => (
                <span style={{ color: "#8c8c8c" }}>
                  Mostrando <strong>{filteredData.length}</strong> de <strong>{total}</strong> lotes
                </span>
              ),
            }}
            style={{ margin: 0 }}
          />
        ) : (
          <div style={{ padding: 24 }}>
            {filteredData.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: "#8c8c8c" }}>
                No se encontraron lotes
              </div>
            ) : (
              <Row gutter={[16, 16]}>
                {filteredData.map((lote) => (
                  <Col key={lote.id_lote} xs={24} sm={12} md={8} lg={6}>
                    <LoteGridCard lote={lote} onAction={openModal} />
                  </Col>
                ))}
              </Row>
            )}
          </div>
        )}
      </Card>

      {/* View Modal */}
      <Modal
        title="Detalle del Lote"
        open={modal.visible && modal.type === "view"}
        onCancel={closeModal}
        footer={[
          <Button key="close" onClick={closeModal}>
            Cerrar
          </Button>,
        ]}
      >
        {modal.record && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Numero">{modal.record.numero_lote}</Descriptions.Item>
            <Descriptions.Item label="Manzana">Manzana {modal.record.id_manzana}</Descriptions.Item>
            <Descriptions.Item label="Precio de Lista">
              ${modal.record.precio_lista.toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={(estadoConfig[modal.record.estado] ?? estadoConfig.disponible).color}>
                {(modal.record.estado ?? "sin estado").toUpperCase()}
              </Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Edit Modal */}
      <Modal
        title="Editar Lote"
        open={modal.visible && modal.type === "edit"}
        onCancel={closeModal}
        onOk={handleEdit}
        okText="Guardar"
        cancelText="Cancelar"
      >
        <Form form={editForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="numero_lote"
            label="Numero de Lote"
            rules={[{ required: true, message: "Ingrese el numero de lote" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="precio_lista"
            label="Precio de Lista"
            rules={[{ required: true, message: "Ingrese el precio" }]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              min={0}
              step={100}
              formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(value) => Number(value?.replace(/\$\s?|[,]/g, "") || 0)}
            />
          </Form.Item>
          <Form.Item
            name="estado"
            label="Estado"
            rules={[{ required: true, message: "Seleccione el estado" }]}
          >
            <Select
              options={[
                { value: "disponible", label: "Disponible" },
                { value: "reservado", label: "Reservado" },
                { value: "en_negociacion", label: "En Negociacion" },
                { value: "vendido", label: "Vendido" },
                { value: "bloqueado", label: "Bloqueado" },
                { value: "no_disponible", label: "No Disponible" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Modal */}
      <Modal
        title="Nuevo Lote"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); createForm.resetFields(); }}
        onOk={handleCreate}
        okText="Crear"
        cancelText="Cancelar"
      >
        <Form form={createForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="numero_lote"
            label="Numero de Lote"
            rules={[{ required: true, message: "Ingrese el numero de lote" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="id_manzana"
            label="Manzana"
            rules={[{ required: true, message: "Ingrese la manzana" }]}
          >
            <InputNumber style={{ width: "100%" }} min={1} />
          </Form.Item>
          <Form.Item
            name="precio_lista"
            label="Precio de Lista"
            rules={[{ required: true, message: "Ingrese el precio" }]}
          >
            <InputNumber<number>
              style={{ width: "100%" }}
              min={0}
              step={100}
              formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
              parser={(value) => Number(value?.replace(/\$\s?|[,]/g, "") || 0)}
            />
          </Form.Item>
          <Form.Item
            name="estado"
            label="Estado"
            rules={[{ required: true, message: "Seleccione el estado" }]}
          >
            <Select
              options={[
                { value: "disponible", label: "Disponible" },
                { value: "reservado", label: "Reservado" },
                { value: "en_negociacion", label: "En Negociacion" },
                { value: "vendido", label: "Vendido" },
                { value: "bloqueado", label: "Bloqueado" },
                { value: "no_disponible", label: "No Disponible" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Delete handled by Popconfirm in the table */}
    </div>
  );
}
