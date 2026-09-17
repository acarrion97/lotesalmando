import { useState, useMemo } from "react";
import { Card, Tag, Typography, Select, Statistic, Row, Col, Button } from "antd";
import { WarningOutlined, ClockCircleOutlined, AlertOutlined, ExclamationCircleOutlined, BellOutlined, ReloadOutlined } from "@ant-design/icons";
import type { TableColumnType } from "antd";
import { useAlertas } from "@/presentation/hooks";
import type { Alerta, AlertaTipo, AlertaPrioridad } from "@/domain/alerta/entities/Alerta";
import { DataTable } from "@/presentation/components/common/DataTable";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";

const { Text } = Typography;

const tipoConfig: Record<AlertaTipo, { color: string; icon: React.ReactNode; label: string }> = {
  inventario: { color: "blue", icon: <AlertOutlined />, label: "Inventario" },
  seguimiento: { color: "orange", icon: <ClockCircleOutlined />, label: "Seguimiento" },
  cartera: { color: "gold", icon: <ExclamationCircleOutlined />, label: "Cartera" },
  mora: { color: "red", icon: <WarningOutlined />, label: "Mora" },
};

const prioridadConfig: Record<AlertaPrioridad, { color: string }> = {
  alta: { color: "red" },
  media: { color: "orange" },
  baja: { color: "green" },
};

export function AlertasPage() {
  const { data: alertas, isLoading, refetch } = useAlertas();
  const [filtroTipo, setFiltroTipo] = useState<AlertaTipo | null>(null);
  const [filtroPrioridad, setFiltroPrioridad] = useState<AlertaPrioridad | null>(null);

  const stats = useMemo(() => {
    if (!alertas) return { total: 0, alta: 0, media: 0, baja: 0, porTipo: {} };
    const porTipo = alertas.reduce((acc, a) => { acc[a.tipo] = (acc[a.tipo] ?? 0) + 1; return acc; }, {} as Record<string, number>);
    return {
      total: alertas.length,
      alta: alertas.filter((a) => a.prioridad === "alta").length,
      media: alertas.filter((a) => a.prioridad === "media").length,
      baja: alertas.filter((a) => a.prioridad === "baja").length,
      porTipo,
    };
  }, [alertas]);

  const filteredData = useMemo(() => {
    if (!alertas) return [];
    return alertas.filter((a) => {
      if (filtroTipo && a.tipo !== filtroTipo) return false;
      if (filtroPrioridad && a.prioridad !== filtroPrioridad) return false;
      return true;
    });
  }, [alertas, filtroTipo, filtroPrioridad]);

  const columns: TableColumnType<Alerta>[] = [
    {
      title: "Prioridad",
      dataIndex: "prioridad",
      key: "prioridad",
      width: 100,
      filters: Object.entries(prioridadConfig).map(([k]) => ({ text: k.charAt(0).toUpperCase() + k.slice(1), value: k })),
      onFilter: (value, record) => record.prioridad === value,
      render: (prioridad: AlertaPrioridad) => {
        const config = prioridadConfig[prioridad] ?? prioridadConfig.media;
        return <Tag color={config.color}>{prioridad.toUpperCase()}</Tag>;
      },
    },
    {
      title: "Tipo",
      dataIndex: "tipo",
      key: "tipo",
      width: 130,
      filters: Object.entries(tipoConfig).map(([k, v]) => ({ text: v.label, value: k })),
      onFilter: (value, record) => record.tipo === value,
      render: (tipo: AlertaTipo) => {
        const config = tipoConfig[tipo] ?? tipoConfig.inventario;
        return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>;
      },
    },
    {
      title: "Alerta",
      dataIndex: "titulo",
      key: "titulo",
      render: (text: string, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{record.descripcion}</Text>
        </div>
      ),
    },
    {
      title: "Hora",
      dataIndex: "created_at",
      key: "created_at",
      width: 150,
      render: (fecha: string) => new Date(fecha).toLocaleTimeString(),
    },
  ];

  return (
    <div>
      <PageToolbar
        title={
          <>
            <BellOutlined /> Mando IA - Alertas
          </>
        }
        subtitle="Alertas automaticas del sistema"
        actions={<Button icon={<ReloadOutlined />} onClick={() => refetch()}>Actualizar</Button>}
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: stats.alta > 0 ? "2px solid #ff4d4f" : undefined }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Total Alertas</span>} value={stats.total} valueStyle={{ fontWeight: 700, fontSize: 22 }} prefix={<BellOutlined style={{ color: "#1677ff" }} />} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffccc7" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Alta Prioridad</span>} value={stats.alta} valueStyle={{ fontWeight: 700, fontSize: 18, color: "#ff4d4f" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffe58f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Media</span>} value={stats.media} valueStyle={{ fontWeight: 700, fontSize: 18, color: "#faad14" }} />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #b7eb8f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Baja</span>} value={stats.baja} valueStyle={{ fontWeight: 700, fontSize: 18, color: "#52c41a" }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {Object.entries(tipoConfig).map(([tipo, config]) => (
          <Col xs={12} sm={6} key={tipo}>
            <Card
              size="small"
              style={{ borderRadius: 10, cursor: "pointer", border: filtroTipo === tipo ? `2px solid ${config.color === "blue" ? "#1677ff" : config.color === "orange" ? "#faad14" : config.color === "gold" ? "#d4b106" : "#ff4d4f"}` : undefined }}
              onClick={() => setFiltroTipo(filtroTipo === tipo ? null : tipo as AlertaTipo)}
            >
              <Statistic title={<span style={{ fontSize: 12 }}>{config.label}</span>} value={stats.porTipo[tipo] ?? 0} valueStyle={{ fontWeight: 700, fontSize: 18 }} prefix={config.icon} />
            </Card>
          </Col>
        ))}
      </Row>

      <Card>
        <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
          <Select placeholder="Filtrar prioridad" allowClear style={{ width: 180 }} value={filtroPrioridad} onChange={(v) => setFiltroPrioridad(v)}>
            <Select.Option value="alta">Alta</Select.Option>
            <Select.Option value="media">Media</Select.Option>
            <Select.Option value="baja">Baja</Select.Option>
          </Select>
        </div>
        <DataTable<Alerta>
          card={false}
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total) => `Total ${total} alertas` }}
        />
      </Card>
    </div>
  );
}
