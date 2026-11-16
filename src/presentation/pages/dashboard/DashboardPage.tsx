import { useState } from "react";
import { Card, Col, Row, Statistic, Typography, Select, Skeleton, Button, Tag } from "antd";
import {
  ProjectOutlined,
  HomeOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  WarningOutlined,
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  TeamOutlined,
  UserOutlined,
  FileTextOutlined,
  PlusOutlined,
  BarChartOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useEstadisticasDashboard, useOnlineStatus } from "@/presentation/hooks";
import { formatCurrency } from "@/utils";

const { Title, Text } = Typography;

export function DashboardPage() {
  const navigate = useNavigate();
  // Una sola consulta para todos los KPIs: la RPC `dashboard_estadisticas`
  // (migración 055) agrega lotes, ventas, cartera, pagos, clientes,
  // asesores y proyectos en el servidor en lugar de descargar las tablas.
  const { data: stats, isLoading } = useEstadisticasDashboard();
  const isOnline = useOnlineStatus();

  const [selectedProyecto, setSelectedProyecto] = useState<number | null>(null);

  const proyectos = stats?.proyectos ?? [];

  const totalLotes = stats?.lotes.total ?? 0;
  const lotesDe = (estado: string) => stats?.lotes.por_estado[estado] ?? 0;
  const lotesDisponibles = lotesDe("disponible");
  const lotesReservados = lotesDe("reservado");
  const lotesVendidos = lotesDe("vendido");
  const lotesEnNegociacion = lotesDe("en_negociacion");

  const ventasCountMesActual = stats?.ventas.mes_actual ?? 0;
  const ventasCountMesAnterior = stats?.ventas.mes_anterior ?? 0;
  const valorVendido = stats?.ventas.valor_vendido ?? 0;

  const cobranzaPendiente = stats?.cartera.monto_pendiente ?? 0;
  const cobranzaVencida = stats?.cartera.monto_vencido ?? 0;
  const cobranzaPagada = stats?.cartera.monto_pagado ?? 0;
  const morosidad = stats?.cartera.vencida ?? 0;

  const pagosRecibidos = stats?.pagos.total ?? 0;

  const getChangePercent = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  };

  const ventasChange = getChangePercent(ventasCountMesActual, ventasCountMesAnterior);

  // Sin datos = sin conexión (este panel no se persiste offline, ver
  // offline/data-policy) o un fallo de la consulta. En ambos casos un 0
  // mentiría: parecería "no hay nada" cuando en realidad no se pudo leer.
  const sinDatos = stats === undefined;
  const motivoSinDatos = isOnline ? "No se pudo cargar" : "Requiere conexión";

  const statCards = [
    {
      title: "Proyectos Activos",
      value: proyectos.length,
      icon: <ProjectOutlined style={{ fontSize: 24, color: "#1677ff" }} />,
      color: "#e6f4ff",
      unavailable: sinDatos,
    },
    {
      title: "Lotes Disponibles",
      value: lotesDisponibles,
      icon: <HomeOutlined style={{ fontSize: 24, color: "#52c41a" }} />,
      color: "#f6ffed",
      unavailable: sinDatos,
    },
    {
      title: "Lotes Reservados",
      value: lotesReservados,
      icon: <ClockCircleOutlined style={{ fontSize: 24, color: "#faad14" }} />,
      color: "#fffbe6",
      unavailable: sinDatos,
    },
    {
      title: "Lotes Vendidos",
      value: lotesVendidos,
      icon: <CheckCircleOutlined style={{ fontSize: 24, color: "#ff4d4f" }} />,
      color: "#fff2f0",
      unavailable: sinDatos,
    },
    {
      title: "Ventas del Mes",
      value: ventasCountMesActual,
      icon: <ShoppingCartOutlined style={{ fontSize: 24, color: "#722ed1" }} />,
      color: "#f9f0ff",
      change: ventasChange,
      unavailable: sinDatos,
    },
    {
      title: "Valor Vendido Total",
      value: valorVendido,
      isCurrency: true,
      icon: <DollarOutlined style={{ fontSize: 24, color: "#13c2c2" }} />,
      color: "#e6fffb",
      unavailable: sinDatos,
    },
    {
      title: "Cartera Pendiente",
      value: cobranzaPendiente,
      isCurrency: true,
      icon: <WalletOutlined style={{ fontSize: 24, color: "#faad14" }} />,
      color: "#fffbe6",
      unavailable: sinDatos,
    },
    {
      title: "Cartera Vencida",
      value: cobranzaVencida,
      isCurrency: true,
      icon: <WarningOutlined style={{ fontSize: 24, color: "#ff4d4f" }} />,
      color: "#fff2f0",
      unavailable: sinDatos,
    },
    {
      title: "Pagos Recibidos",
      value: pagosRecibidos,
      isCurrency: true,
      icon: <ArrowUpOutlined style={{ fontSize: 24, color: "#52c41a" }} />,
      color: "#f6ffed",
      unavailable: sinDatos,
    },
  ];

  const quickActions = [
    { label: "Nuevo Proyecto", icon: <PlusOutlined />, path: "/proyectos", color: "#1677ff" },
    { label: "Ver Lotes", icon: <HomeOutlined />, path: "/lotes", color: "#52c41a" },
    { label: "Mapa", icon: <BarChartOutlined />, path: "/mapas", color: "#13c2c2" },
    { label: "Prospectos", icon: <UserOutlined />, path: "/prospectos", color: "#722ed1" },
    { label: "Cobranzas", icon: <WalletOutlined />, path: "/cobranzas", color: "#faad14" },
    { label: "Reportes", icon: <FileTextOutlined />, path: "/reportes", color: "#ff4d4f" },
  ];

  if (isLoading) {
    return (
      <div>
        <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 24 }} />
        <Row gutter={[16, 16]}>
          {Array.from({ length: 9 }).map((_, i) => (
            <Col xs={24} sm={12} lg={8} key={i}>
              <Card><Skeleton active paragraph={{ rows: 1 }} /></Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Centro de Mando</Title>
          <Text type="secondary">Resumen general del negocio</Text>
        </div>
        <Select
          placeholder="Filtrar por proyecto"
          allowClear
          style={{ width: 250 }}
          value={selectedProyecto}
          onChange={(val) => setSelectedProyecto(val)}
          options={proyectos.map((p) => ({ value: p.id_proyecto, label: p.nombre }))}
        />
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((card) => (
          <Col xs={24} sm={12} lg={8} key={card.title}>
            <Card hoverable style={{ borderRadius: 10 }} styles={{ body: { padding: "20px 24px" } }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ width: 48, height: 48, borderRadius: 10, background: card.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {card.icon}
                </div>
                <div style={{ textAlign: "right" }}>
                  {"unavailable" in card && card.unavailable ? (
                    <Statistic
                      title={card.title}
                      value="—"
                      styles={{ content: { fontSize: 22, fontWeight: 700, color: "#8c8c8c" } }}
                    />
                  ) : (
                    <Statistic
                      title={card.title}
                      value={card.value}
                      precision={card.isCurrency ? 0 : 0}
                      styles={{
                        content: {
                          fontSize: 22,
                          fontWeight: 700,
                          color: card.title === "Cartera Vencida" ? "#ff4d4f" : undefined,
                        },
                      }}
                      formatter={card.isCurrency ? (val) => formatCurrency(val as number) : undefined}
                    />
                  )}
                  {"unavailable" in card && card.unavailable ? (
                    <Tag color="warning" style={{ fontSize: 11 }}>{motivoSinDatos}</Tag>
                  ) : (
                    "change" in card && card.change !== undefined && (
                      <Tag color={card.change >= 0 ? "green" : "red"} style={{ fontSize: 11 }}>
                        {card.change >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {Math.abs(card.change)}% vs mes anterior
                      </Tag>
                    )
                  )}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="Accesos Rapidos" style={{ borderRadius: 10 }}>
            <Row gutter={[12, 12]}>
              {quickActions.map((action) => (
                <Col xs={12} sm={8} key={action.label}>
                  <Button
                    block
                    style={{ height: 60, borderRadius: 8, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}
                    icon={<span style={{ fontSize: 20, color: action.color }}>{action.icon}</span>}
                    onClick={() => navigate(action.path)}
                  >
                    {action.label}
                  </Button>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Resumen Cartera" style={{ borderRadius: 10 }}>
            {sinDatos ? (
              <Text type="secondary">
                {isOnline ? "No se pudo cargar la cartera." : "Se requiere conexión para consultar la cartera."}
              </Text>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text>Total Cartera</Text>
                  <Text strong style={{ fontSize: 16 }}>{formatCurrency(cobranzaPendiente + cobranzaVencida + cobranzaPagada)}</Text>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text>Pagada</Text>
                  <Tag color="green">{formatCurrency(cobranzaPagada)}</Tag>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text>Pendiente</Text>
                  <Tag color="orange">{formatCurrency(cobranzaPendiente)}</Tag>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text>Vencida</Text>
                  <Tag color="red">{formatCurrency(cobranzaVencida)}</Tag>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Text>Morosidad</Text>
                  <Tag color={morosidad > 5 ? "red" : "green"}>{morosidad} cuotas</Tag>
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card title="Distribucion de Lotes" style={{ borderRadius: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { label: "Disponibles", count: lotesDisponibles, color: "#52c41a" },
                { label: "Reservados", count: lotesReservados, color: "#faad14" },
                { label: "En Negociacion", count: lotesEnNegociacion, color: "#1677ff" },
                { label: "Vendidos", count: lotesVendidos, color: "#ff4d4f" },
              ].map((item) => (
                <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
                  <Text style={{ flex: 1 }}>{item.label}</Text>
                  <Text strong>{item.count}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{totalLotes > 0 ? Math.round((item.count / totalLotes) * 100) : 0}%</Text>
                </div>
              ))}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card title="Metricas Comerciales" style={{ borderRadius: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <Statistic title="Clientes Registrados" value={stats?.clientes ?? 0} styles={{ content: { fontWeight: 700 } }} prefix={<UserOutlined style={{ color: "#1677ff" }} />} />
              <Statistic title="Asesores Activos" value={stats?.asesores_activos ?? 0} styles={{ content: { fontWeight: 700 } }} prefix={<TeamOutlined style={{ color: "#52c41a" }} />} />
              <Statistic title="Cotizaciones" value={0} styles={{ content: { fontWeight: 700 } }} prefix={<FileTextOutlined style={{ color: "#722ed1" }} />} />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
