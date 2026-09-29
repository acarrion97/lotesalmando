import { useState, useMemo } from "react";
import {
  Card,
  Button,
  Space,
  Tag,
  Modal,
  Form,
  Select,
  InputNumber,
  Descriptions,
  message,
  Popconfirm,
  Row,
  Col,
  Statistic,
  Tooltip,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
} from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useCotizaciones, useTodosClientes, useLotes, useLookup } from "@/presentation/hooks";
import type { Cotizacion, CotizacionEstado } from "@/domain/cotizacion/entities/Cotizacion";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { getContainer } from "@/infrastructure/container";

const estadoConfig: Record<CotizacionEstado, { color: string; label: string }> = {
  borrador: { color: "default", label: "BORRADOR" },
  enviada: { color: "processing", label: "ENVIADA" },
  aceptada: { color: "success", label: "ACEPTADA" },
  rechazada: { color: "error", label: "RECHAZADA" },
};

interface ModalState {
  type: "view" | "edit" | "create" | null;
  visible: boolean;
  record: Cotizacion | null;
}

export function CotizacionesPage() {
  const { data: cotizaciones, isLoading } = useCotizaciones();
  const { data: clientes } = useTodosClientes();
  const { data: lotes } = useLotes();
  const clienteMap = useLookup(clientes, "id_cliente", "nombres", "Cliente");
  const loteMap = useLookup(lotes, "id_lote", "numero_lote", "Lote");
  const [searchText, setSearchText] = useState("");
  const [modalState, setModalState] = useState<ModalState>({ type: null, visible: false, record: null });
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const stats = useMemo(() => {
    if (!cotizaciones) return { total: 0, borrador: 0, enviada: 0, aceptada: 0, rechazada: 0 };
    return {
      total: cotizaciones.length,
      borrador: cotizaciones.filter((c) => c.estado === "borrador").length,
      enviada: cotizaciones.filter((c) => c.estado === "enviada").length,
      aceptada: cotizaciones.filter((c) => c.estado === "aceptada").length,
      rechazada: cotizaciones.filter((c) => c.estado === "rechazada").length,
    };
  }, [cotizaciones]);

  const filteredData = useMemo(() => {
    if (!cotizaciones) return [];
    return cotizaciones.filter(
      (c) =>
        c.estado.toLowerCase().includes(searchText.toLowerCase()) ||
        String(c.precio_ofertado).includes(searchText),
    );
  }, [cotizaciones, searchText]);

  const openModal = (type: "view" | "edit" | "create", record: Cotizacion | null = null) => {
    setModalState({ type, visible: true, record });
    if (type === "edit" && record) {
      form.setFieldsValue(record);
    }
  };

  const closeModal = () => {
    setModalState({ type: null, visible: false, record: null });
    form.resetFields();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;

    const container = getContainer();
    try {
      if (modalState.type === "edit" && modalState.record) {
        await container.updateCotizacion.execute(modalState.record.id_cotizacion, {
          id_cliente: values.id_cliente,
          id_lote: values.id_lote,
          precio_ofertado: values.precio_ofertado,
          estado: values.estado,
        });
        message.success("Cotizacion actualizada correctamente");
      } else {
        await container.createCotizacion.execute({
          id_cliente: values.id_cliente,
          id_lote: values.id_lote,
          precio_ofertado: values.precio_ofertado,
          estado: values.estado ?? "borrador",
        });
        message.success("Cotizacion creada correctamente");
      }

      await queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      closeModal();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "No se pudo guardar la cotizacion");
    }
  };

  const columns: TableColumnType<Cotizacion>[] = [
    {
      title: "ID",
      dataIndex: "id_cotizacion",
      key: "id_cotizacion",
      width: 80,
      sorter: (a, b) => a.id_cotizacion - b.id_cotizacion,
    },
    {
      title: "Cliente",
      dataIndex: "id_cliente",
      key: "id_cliente",
      render: (id: number) => <span style={{ fontWeight: 500 }}>{clienteMap[id] ?? `Cliente #${id}`}</span>,
    },
    {
      title: "Lote",
      dataIndex: "id_lote",
      key: "id_lote",
      render: (id: number) => <Tag>{loteMap[id] ? `${loteMap[id]} #${id}` : `Lote #${id}`}</Tag>,
    },
    {
      title: "Precio Ofertado",
      dataIndex: "precio_ofertado",
      key: "precio_ofertado",
      sorter: (a, b) => a.precio_ofertado - b.precio_ofertado,
      render: (precio: number) => (
        <span style={{ fontWeight: 600, color: "#1677ff" }}>${precio.toLocaleString()}</span>
      ),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: Object.entries(estadoConfig).map(([value, { label }]) => ({ text: label, value })),
      onFilter: (value, record) => record.estado === value,
      render: (estado: CotizacionEstado) => {
        const config = estadoConfig[estado];
        return (
          <Tag color={config.color} style={{ fontWeight: 600, borderRadius: 12 }}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Ver detalle">
            <Button type="text" icon={<EyeOutlined />} onClick={() => openModal("view", record)} style={{ color: "#1677ff" }} />
          </Tooltip>
          <Tooltip title="Editar">
            <Button type="text" icon={<EditOutlined />} onClick={() => openModal("edit", record)} style={{ color: "#faad14" }} />
          </Tooltip>
          <Popconfirm title="Eliminar cotizacion?" onConfirm={() => message.success("Eliminada")}>
            <Tooltip title="Eliminar">
              <Button type="text" icon={<DeleteOutlined />} style={{ color: "#ff4d4f" }} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageToolbar
        title="Cotizaciones"
        subtitle="Gestion de cotizaciones y presupuestos"
        search={{ value: searchText, onChange: setSearchText }}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal("create")}>
            Nueva Cotizacion
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Total</span>} value={stats.total} valueStyle={{ fontWeight: 700, fontSize: 24 }} prefix={<FileTextOutlined style={{ color: "#1677ff" }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #d9d9d9" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Borrador</span>} value={stats.borrador} valueStyle={{ fontWeight: 700, fontSize: 24, color: "#8c8c8c" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #91caff" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Enviadas</span>} value={stats.enviada} valueStyle={{ fontWeight: 700, fontSize: 24, color: "#1677ff" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #b7eb8f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Aceptadas</span>} value={stats.aceptada} valueStyle={{ fontWeight: 700, fontSize: 24, color: "#52c41a" }} />
          </Card>
        </Col>
      </Row>

      <DataTable<Cotizacion>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_cotizacion"
        loading={isLoading}
      />

      <Modal
        title={modalState.type === "create" ? "Nueva Cotizacion" : modalState.type === "edit" ? "Editar Cotizacion" : "Detalle de Cotizacion"}
        open={modalState.visible}
        onCancel={closeModal}
        footer={modalState.type === "view" ? [<Button key="close" onClick={closeModal}>Cerrar</Button>] : [
          <Button key="cancel" onClick={closeModal}>Cancelar</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit}>
            {modalState.type === "create" ? "Crear" : "Guardar"}
          </Button>,
        ]}
        width={600}
      >
        {modalState.type === "view" && modalState.record ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="ID">{modalState.record.id_cotizacion}</Descriptions.Item>
            <Descriptions.Item label="Cliente">{clienteMap[modalState.record.id_cliente] ?? `Cliente #${modalState.record.id_cliente}`}</Descriptions.Item>
            <Descriptions.Item label="Lote">{loteMap[modalState.record.id_lote] ? `${loteMap[modalState.record.id_lote]} #${modalState.record.id_lote}` : `Lote #${modalState.record.id_lote}`}</Descriptions.Item>
            <Descriptions.Item label="Precio Ofertado">${modalState.record.precio_ofertado.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={estadoConfig[modalState.record.estado]?.color}>{estadoConfig[modalState.record.estado]?.label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item name="id_cliente" label="Cliente" rules={[{ required: true, message: "Seleccione un cliente" }]}>
              <Select
                placeholder="Seleccionar cliente"
                showSearch
                optionFilterProp="label"
                options={clientes?.map((c) => ({ value: c.id_cliente, label: `${c.nombres} - ${c.cedula_ruc}` })) ?? []}
              />
            </Form.Item>
            <Form.Item name="id_lote" label="Lote" rules={[{ required: true, message: "Seleccione un lote" }]}>
              <Select
                placeholder="Seleccionar lote"
                showSearch
                optionFilterProp="label"
                options={lotes?.map((l) => ({ value: l.id_lote, label: `Lote ${l.numero_lote}` })) ?? []}
              />
            </Form.Item>
            <Form.Item name="precio_ofertado" label="Precio Ofertado" rules={[{ required: true, message: "Ingrese el precio" }]}>
              <InputNumber<number>
                style={{ width: "100%" }}
                min={0}
                step={100}
                formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(value) => Number(value?.replace(/\$\s?|[,]/g, "") || 0)}
              />
            </Form.Item>
            {modalState.type === "edit" && (
              <Form.Item name="estado" label="Estado" rules={[{ required: true, message: "Seleccione el estado" }]}>
                <Select
                  placeholder="Seleccionar estado"
                  options={Object.entries(estadoConfig).map(([value, { label }]) => ({ value, label }))}
                />
              </Form.Item>
            )}
          </Form>
        )}
      </Modal>
    </div>
  );
}
