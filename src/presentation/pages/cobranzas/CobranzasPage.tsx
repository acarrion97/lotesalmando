import { useState, useMemo } from "react";
import { Card, Button, Tag, Descriptions, Modal, Row, Col, Statistic, Tooltip, message } from "antd";
import { EyeOutlined, WarningOutlined, ReloadOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useCobranzas, useCarteraMetricas, useOnlineStatus, useContratos, useLookup } from "@/presentation/hooks";
import { getContainer } from "@/infrastructure/container";
import { useQueryClient } from "@tanstack/react-query";
import { RequiresConnection } from "@/presentation/components/common/RequiresConnection";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";

type CobranzaRow = {
  id_cobranza: number;
  id_contrato: number;
  numero_cuota: number;
  monto_cuota: number;
  estado: "pendiente" | "pagada" | "vencida";
};

const estadoConfig: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
  pendiente: { color: "orange", icon: <ClockCircleOutlined />, label: "Pendiente" },
  pagada: { color: "green", icon: <CheckCircleOutlined />, label: "Pagada" },
  vencida: { color: "red", icon: <CloseCircleOutlined />, label: "Vencida" },
};

export function CobranzasPage() {
  const { data: cobranzas, isLoading } = useCobranzas();
  const { data: metricas } = useCarteraMetricas();
  const { data: contratos } = useContratos();
  const contratoMap = useLookup(contratos, "id_contrato", "numero_contrato", "Contrato");
  const isOnline = useOnlineStatus();
  const [searchText, setSearchText] = useState("");
  const [viewModal, setViewModal] = useState<{ visible: boolean; record: CobranzaRow | null }>({ visible: false, record: null });
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const handleDetectarVencidas = async () => {
    try {
      const container = getContainer();
      const detectadas = await container.detectarCuotasVencidas.execute();
      await queryClient.invalidateQueries({ queryKey: ["cobranzas"] });
      await queryClient.invalidateQueries({ queryKey: ["carteraMetricas"] });
      messageApi.success(`${detectadas} cuotas marcadas como vencidas`);
    } catch {
      messageApi.error("Error detectando cuotas vencidas");
    }
  };

  const filteredData = useMemo(() => {
    if (!cobranzas) return [];
    return cobranzas.filter(
      (c) =>
        String(c.id_contrato).includes(searchText) ||
        String(c.numero_cuota).includes(searchText) ||
        c.estado.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [cobranzas, searchText]);

  const columns: TableColumnType<CobranzaRow>[] = [
    {
      title: "Contrato",
      dataIndex: "id_contrato",
      key: "id_contrato",
      render: (id: number) => contratoMap[id] ?? `Contrato #${id}`,
      sorter: (a, b) => a.id_contrato - b.id_contrato,
    },
    {
      title: "Cuota",
      dataIndex: "numero_cuota",
      key: "numero_cuota",
      sorter: (a, b) => a.numero_cuota - b.numero_cuota,
    },
    {
      title: "Monto",
      dataIndex: "monto_cuota",
      key: "monto_cuota",
      sorter: (a, b) => a.monto_cuota - b.monto_cuota,
      render: (monto: number) => <span style={{ fontWeight: 600 }}>${monto.toLocaleString()}</span>,
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      filters: Object.entries(estadoConfig).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value, record) => record.estado === value,
      render: (estado: string) => {
        const config = estadoConfig[estado] ?? estadoConfig.pendiente;
        return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>;
      },
    },
    {
      title: "Acciones",
      key: "acciones",
      width: 80,
      render: (_: unknown, record: CobranzaRow) => (
        <Tooltip title="Ver detalle">
          <Button type="text" icon={<EyeOutlined />} style={{ color: "#1677ff" }} onClick={() => setViewModal({ visible: true, record })} />
        </Tooltip>
      ),
    },
  ];

  if (!isOnline && !isLoading && !cobranzas) {
    return <RequiresConnection />;
  }

  return (
    <div>
      {contextHolder}
      <PageToolbar
        title="Cobranzas"
        subtitle="Control de cuotas y morosidad"
        search={{ value: searchText, onChange: setSearchText, placeholder: "Buscar cobranza..." }}
        actions={<Button icon={<ReloadOutlined />} onClick={handleDetectarVencidas}>Detectar Vencidas</Button>}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Total Cuotas</span>} value={metricas?.totalCobranzas ?? 0} styles={{ content: { fontWeight: 700, fontSize: 22 } }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffe58f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Pendientes</span>} value={metricas?.pendientes ?? 0} styles={{ content: { fontWeight: 700, fontSize: 18, color: "#faad14" } }} prefix={<ClockCircleOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffccc7" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Vencidas</span>} value={metricas?.vencidas ?? 0} styles={{ content: { fontWeight: 700, fontSize: 18, color: "#ff4d4f" } }} prefix={<WarningOutlined />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #d9d9d9" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Morosidad</span>} value={metricas?.morosidadPorcentaje ?? 0} styles={{ content: { fontWeight: 700, fontSize: 18, color: (metricas?.morosidadPorcentaje ?? 0) > 20 ? "#ff4d4f" : "#52c41a" } }} suffix="%" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Monto Total Cartera</span>} value={metricas?.montoTotal ?? 0} styles={{ content: { fontWeight: 700, fontSize: 16 } }} formatter={(val) => `$${(val as number).toLocaleString()}`} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Monto Pendiente</span>} value={metricas?.montoPendiente ?? 0} styles={{ content: { fontWeight: 700, fontSize: 16, color: "#faad14" } }} formatter={(val) => `$${(val as number).toLocaleString()}`} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Monto Vencido</span>} value={metricas?.montoVencido ?? 0} styles={{ content: { fontWeight: 700, fontSize: 16, color: "#ff4d4f" } }} formatter={(val) => `$${(val as number).toLocaleString()}`} />
          </Card>
        </Col>
      </Row>

      <DataTable<CobranzaRow>
        columns={columns}
        dataSource={filteredData}
        rowKey="id_cobranza"
        loading={isLoading}
      />

      <Modal title="Detalle de Cobranza" open={viewModal.visible} onCancel={() => setViewModal({ visible: false, record: null })} footer={[<Button key="close" onClick={() => setViewModal({ visible: false, record: null })}>Cerrar</Button>]} width={500}>
        {viewModal.record && (
          <Descriptions bordered column={2} size="small" style={{ marginTop: 16 }}>
            <Descriptions.Item label="# Cobranza">{viewModal.record.id_cobranza}</Descriptions.Item>
            <Descriptions.Item label="Estado"><Tag color={estadoConfig[viewModal.record.estado]?.color}>{estadoConfig[viewModal.record.estado]?.label}</Tag></Descriptions.Item>
            <Descriptions.Item label="Contrato">#{viewModal.record.id_contrato}</Descriptions.Item>
            <Descriptions.Item label="Cuota">#{viewModal.record.numero_cuota}</Descriptions.Item>
            <Descriptions.Item label="Monto" span={2}><span style={{ fontWeight: 700, fontSize: 18 }}>${viewModal.record.monto_cuota.toLocaleString()}</span></Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
}
