import { useState, useMemo } from "react";
import {
  Card,
  Button,
  Space,
  Tag,
  Typography,
  Modal,
  Descriptions,
  Row,
  Col,
  Statistic,
  Tooltip,
} from "antd";
import {
  EyeOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  PlusOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useVentas, useClientes, useLotes, useUsuarios, useLookup } from "@/presentation/hooks";
import type { Venta, VentaEstado } from "@/domain/venta/entities/Venta";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";

const { Title, Text } = Typography;

const estadoConfig: Record<VentaEstado, { color: string; label: string; icon: React.ReactNode }> = {
  pendiente: { color: "processing", label: "PENDIENTE", icon: <ClockCircleOutlined /> },
  completada: { color: "success", label: "COMPLETADA", icon: <CheckCircleOutlined /> },
  cancelada: { color: "error", label: "CANCELADA", icon: <StopOutlined /> },
};

interface ModalState {
  type: "view" | "info" | null;
  visible: boolean;
  record: Venta | null;
}

export function VentasPage() {
  const { data: ventas, isLoading } = useVentas();
  const { data: clientes } = useClientes();
  const { data: lotes } = useLotes();
  const { data: usuarios } = useUsuarios();
  const clienteMap = useLookup(clientes, "id_cliente", "nombres", "Cliente");
  const loteMap = useLookup(lotes, "id_lote", "numero_lote", "Lote");
  const usuarioMap = useLookup(usuarios, "id_usuario", "nombres", "Usuario");
  const [searchText, setSearchText] = useState("");
  const [modalState, setModalState] = useState<ModalState>({ type: null, visible: false, record: null });

  const stats = useMemo(() => {
    if (!ventas) return { total: 0, pendiente: 0, completada: 0, cancelada: 0, valorTotal: 0 };
    return {
      total: ventas.length,
      pendiente: ventas.filter((v) => v.estado === "pendiente").length,
      completada: ventas.filter((v) => v.estado === "completada").length,
      cancelada: ventas.filter((v) => v.estado === "cancelada").length,
      valorTotal: ventas.reduce((sum, v) => sum + v.precio_final, 0),
    };
  }, [ventas]);

  const filteredData = useMemo(() => {
    if (!ventas) return [];
    return ventas.filter(
      (v) =>
        v.estado.toLowerCase().includes(searchText.toLowerCase()) ||
        String(v.precio_final).includes(searchText),
    );
  }, [ventas, searchText]);

  const columns: TableColumnType<Venta>[] = [
    {
      title: "ID",
      dataIndex: "id_venta",
      key: "id_venta",
      width: 80,
      sorter: (a, b) => a.id_venta - b.id_venta,
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
      title: "Precio Final",
      dataIndex: "precio_final",
      key: "precio_final",
      sorter: (a, b) => a.precio_final - b.precio_final,
      render: (precio: number) => (
        <span style={{ fontWeight: 600, color: "#52c41a" }}>${precio.toLocaleString()}</span>
      ),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: Object.entries(estadoConfig).map(([value, { label }]) => ({ text: label, value })),
      onFilter: (value, record) => record.estado === value,
      render: (estado: VentaEstado) => {
        const config = estadoConfig[estado];
        return (
          <Tag color={config.color} icon={config.icon} style={{ fontWeight: 600, borderRadius: 12 }}>
            {config.label}
          </Tag>
        );
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 80,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Ver detalle">
            <Button type="text" icon={<EyeOutlined />} onClick={() => setModalState({ type: "view", visible: true, record })} style={{ color: "#1677ff" }} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <PageToolbar
        title="Ventas"
        subtitle="Registro de ventas realizadas"
        search={{ value: searchText, onChange: setSearchText }}
        actions={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalState({ type: "info", visible: true, record: null })}>
            Nueva Venta
          </Button>
        }
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Total Ventas</span>} value={stats.total} styles={{ content: { fontWeight: 700, fontSize: 24 } }} prefix={<DollarOutlined style={{ color: "#1677ff" }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #b7eb8f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Completadas</span>} value={stats.completada} styles={{ content: { fontWeight: 700, fontSize: 24, color: "#52c41a" } }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #91caff" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Pendientes</span>} value={stats.pendiente} styles={{ content: { fontWeight: 700, fontSize: 24, color: "#1677ff" } }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #f0f0f0" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Valor Total</span>} value={stats.valorTotal} styles={{ content: { fontWeight: 700, fontSize: 24, color: "#262626" } }} prefix="$" />
          </Card>
        </Col>
      </Row>

      <DataTable<Venta>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_venta"
        loading={isLoading}
      />

      <Modal
        title={modalState.type === "view" ? "Detalle de Venta" : "Nueva Venta"}
        open={modalState.visible}
        onCancel={() => setModalState({ type: null, visible: false, record: null })}
        footer={modalState.type === "view" ? [<Button key="close" onClick={() => setModalState({ type: null, visible: false, record: null })}>Cerrar</Button>] : null}
        width={600}
      >
        {modalState.type === "view" && modalState.record ? (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="ID">{modalState.record.id_venta}</Descriptions.Item>
            <Descriptions.Item label="Cliente">{clienteMap[modalState.record.id_cliente] ?? `Cliente #${modalState.record.id_cliente}`}</Descriptions.Item>
            <Descriptions.Item label="Lote">{loteMap[modalState.record.id_lote] ? `${loteMap[modalState.record.id_lote]} #${modalState.record.id_lote}` : `Lote #${modalState.record.id_lote}`}</Descriptions.Item>
            <Descriptions.Item label="Cotizacion">Cotizacion #{modalState.record.id_cotizacion}</Descriptions.Item>
            <Descriptions.Item label="Usuario">{usuarioMap[modalState.record.id_usuario] ?? `Usuario #${modalState.record.id_usuario}`}</Descriptions.Item>
            <Descriptions.Item label="Precio Final">${modalState.record.precio_final.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={estadoConfig[modalState.record.estado]?.color}>{estadoConfig[modalState.record.estado]?.label}</Tag>
            </Descriptions.Item>
          </Descriptions>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <InfoCircleOutlined style={{ fontSize: 48, color: "#1677ff", marginBottom: 16 }} />
            <Title level={5}>Las ventas se crean al aceptar una cotizacion</Title>
            <Text type="secondary">Para crear una venta, primero debe crear y aceptar una cotizacion desde el modulo de Cotizaciones.</Text>
            <br /><br />
            <Button type="primary" onClick={() => setModalState({ type: null, visible: false, record: null })}>Ir a Cotizaciones</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
