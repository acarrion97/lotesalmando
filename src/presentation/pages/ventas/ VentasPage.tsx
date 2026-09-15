import { useState, useMemo } from "react";
import { Table, Card, Button, Input, Tag, Typography, Descriptions, Modal, Row, Col, Statistic, Tooltip } from "antd";
import { SearchOutlined, EyeOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, DollarOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useVentas } from "@/presentation/hooks";
import type { Venta, VentaEstado } from "@/domain/venta/entities/Venta";

const { Title, Text } = Typography;

const estadoConfig: Record<VentaEstado, { color: string; icon: React.ReactNode }> = {
  pendiente: { color: "orange", icon: <ClockCircleOutlined /> },
  completada: { color: "green", icon: <CheckCircleOutlined /> },
  cancelada: { color: "red", icon: <CloseCircleOutlined /> },
};

export function VentasPage() {
  const { data: ventas, isLoading } = useVentas();
  const [searchText, setSearchText] = useState("");
  const [viewModal, setViewModal] = useState<{ visible: boolean; record: Venta | null }>({ visible: false, record: null });

  const stats = useMemo(() => {
    if (!ventas) return { total: 0, pendientes: 0, completadas: 0, canceladas: 0, montoTotal: 0 };
    return {
      total: ventas.length,
      pendientes: ventas.filter((v) => v.estado === "pendiente").length,
      completadas: ventas.filter((v) => v.estado === "completada").length,
      canceladas: ventas.filter((v) => v.estado === "cancelada").length,
      montoTotal: ventas.reduce((sum, v) => sum + v.precio_final, 0),
    };
  }, [ventas]);

  const filteredData = useMemo(() => {
    if (!ventas) return [];
    return ventas.filter((v) => String(v.id_venta).includes(searchText) || String(v.precio_final).includes(searchText));
  }, [ventas, searchText]);

  const columns: TableColumnType<Venta>[] = [
    {
      title: "# Venta",
      dataIndex: "id_venta",
      key: "id_venta",
      sorter: (a, b) => a.id_venta - b.id_venta,
    },
    {
      title: "Cliente",
      dataIndex: "id_cliente",
      key: "id_cliente",
      render: (id: number) => <span>Cliente #{id}</span>,
    },
    {
      title: "Lote",
      dataIndex: "id_lote",
      key: "id_lote",
      render: (id: number) => <Tag>Lote #{id}</Tag>,
    },
    {
      title: "Precio Final",
      dataIndex: "precio_final",
      key: "precio_final",
      sorter: (a, b) => a.precio_final - b.precio_final,
      render: (val: number) => <span style={{ fontWeight: 600 }}>${val.toLocaleString()}</span>,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: Object.entries(estadoConfig).map(([k]) => ({ text: k.charAt(0).toUpperCase() + k.slice(1), value: k })),
      onFilter: (value, record) => record.estado === value,
      render: (estado: VentaEstado) => {
        const config = estadoConfig[estado] ?? estadoConfig.pendiente;
        return <Tag color={config.color} icon={config.icon}>{estado.charAt(0).toUpperCase() + estado.slice(1)}</Tag>;
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 80,
      render: (_: unknown, record: Venta) => (
        <Tooltip title="Ver detalle">
          <Button type="text" icon={<EyeOutlined />} style={{ color: "#1677ff" }} onClick={() => setViewModal({ visible: true, record })} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>Ventas</Title>
          <Text type="secondary">Historial de ventas realizadas</Text>
        </div>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Total Ventas</span>} value={stats.total} valueStyle={{ fontWeight: 700, fontSize: 22 }} prefix={<DollarOutlined style={{ color: "#1677ff" }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffe58f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Pendientes</span>} value={stats.pendientes} valueStyle={{ fontWeight: 700, fontSize: 18, color: "#faad14" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #b7eb8f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Completadas</span>} value={stats.completadas} valueStyle={{ fontWeight: 700, fontSize: 18, color: "#52c41a" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #d9d9d9" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Monto Total</span>} value={stats.montoTotal} valueStyle={{ fontWeight: 700, fontSize: 18 }} formatter={(val) => `$${(val as number).toLocaleString()}`} />
          </Card>
        </Col>
      </Row>

      <Card>
        <div style={{ marginBottom: 16 }}>
          <Input placeholder="Buscar venta..." prefix={<SearchOutlined />} value={searchText} onChange={(e) => setSearchText(e.target.value)} style={{ width: 300, borderRadius: 8 }} allowClear />
        </div>
        <Table<Venta>
          columns={columns}
          dataSource={filteredData}
          rowKey="id_venta"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} registros` }}
        />
      </Card>

      <Modal title="Detalle de Venta" open={viewModal.visible} onCancel={() => setViewModal({ visible: false, record: null })} footer={[<Button key="close" onClick={() => setViewModal({ visible: false, record: null })}>Cerrar</Button>]} width={550}>
        {viewModal.record && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="# Venta">{viewModal.record.id_venta}</Descriptions.Item>
            <Descriptions.Item label="Estado"><Tag color={estadoConfig[viewModal.record.estado]?.color}>{viewModal.record.estado}</Tag></Descriptions.Item>
            <Descriptions.Item label="Cliente">Cliente #{viewModal.record.id_cliente}</Descriptions.Item>
            <Descriptions.Item label="Lote">Lote #{viewModal.record.id_lote}</Descriptions.Item>
            <Descriptions.Item label="Cotizacion">Cotizacion #{viewModal.record.id_cotizacion}</Descriptions.Item>
            <Descriptions.Item label="Asesor">Usuario #{viewModal.record.id_usuario}</Descriptions.Item>
            <Descriptions.Item label="Precio Final" span={2}><span style={{ fontWeight: 700, fontSize: 18 }}>${viewModal.record.precio_final.toLocaleString()}</span></Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
