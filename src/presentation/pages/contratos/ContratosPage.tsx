import { useState, useMemo } from "react";
import { Card, Button, Tag, Descriptions, Modal, Row, Col, Statistic, Tooltip } from "antd";
import { EyeOutlined, FileTextOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useContratos } from "@/presentation/hooks";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";

type ContratoRow = {
  id_contrato: number;
  id_venta: number;
  numero_contrato: string;
  monto_total: number;
};

export function ContratosPage() {
  const { data: contratos, isLoading } = useContratos();
  const [searchText, setSearchText] = useState("");
  const [viewModal, setViewModal] = useState<{ visible: boolean; record: ContratoRow | null }>({ visible: false, record: null });

  const stats = useMemo(() => {
    if (!contratos) return { total: 0, montoTotal: 0 };
    return {
      total: contratos.length,
      montoTotal: contratos.reduce((sum, c) => sum + c.monto_total, 0),
    };
  }, [contratos]);

  const filteredData = useMemo(() => {
    if (!contratos) return [];
    return contratos.filter((c) =>
      c.numero_contrato.toLowerCase().includes(searchText.toLowerCase()) ||
      String(c.id_venta).includes(searchText)
    );
  }, [contratos, searchText]);

  const columns: TableColumnType<ContratoRow>[] = [
    {
      title: "# Contrato",
      dataIndex: "numero_contrato",
      key: "numero_contrato",
      sorter: (a, b) => a.numero_contrato.localeCompare(b.numero_contrato),
      render: (text: string) => <Tag color="blue" style={{ fontWeight: 600 }}>{text}</Tag>,
    },
    {
      title: "Venta",
      dataIndex: "id_venta",
      key: "id_venta",
      sorter: (a, b) => a.id_venta - b.id_venta,
    },
    {
      title: "Monto Total",
      dataIndex: "monto_total",
      key: "monto_total",
      sorter: (a, b) => a.monto_total - b.monto_total,
      render: (val: number) => <span style={{ fontWeight: 600 }}>${val.toLocaleString()}</span>,
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 80,
      render: (_: unknown, record: ContratoRow) => (
        <Tooltip title="Ver detalle">
          <Button type="text" icon={<EyeOutlined />} style={{ color: "#1677ff" }} onClick={() => setViewModal({ visible: true, record })} />
        </Tooltip>
      ),
    },
  ];

  return (
    <div>
      <PageToolbar
        title="Contratos"
        subtitle="Contratos generados automaticamente al crear ventas"
        search={{ value: searchText, onChange: setSearchText, placeholder: "Buscar contrato..." }}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Total Contratos</span>} value={stats.total} valueStyle={{ fontWeight: 700, fontSize: 22 }} prefix={<FileTextOutlined style={{ color: "#1677ff" }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #d9d9d9" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Monto Total</span>} value={stats.montoTotal} valueStyle={{ fontWeight: 700, fontSize: 18 }} formatter={(val) => `$${(val as number).toLocaleString()}`} />
          </Card>
        </Col>
      </Row>

      <DataTable<ContratoRow>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_contrato"
        loading={isLoading}
      />

      <Modal title="Detalle de Contrato" open={viewModal.visible} onCancel={() => setViewModal({ visible: false, record: null })} footer={[<Button key="close" onClick={() => setViewModal({ visible: false, record: null })}>Cerrar</Button>]} width={500}>
        {viewModal.record && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="# Contrato"><Tag color="blue">{viewModal.record.numero_contrato}</Tag></Descriptions.Item>
            <Descriptions.Item label="# Venta">{viewModal.record.id_venta}</Descriptions.Item>
            <Descriptions.Item label="Monto Total" span={2}><span style={{ fontWeight: 700, fontSize: 18 }}>${viewModal.record.monto_total.toLocaleString()}</span></Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
