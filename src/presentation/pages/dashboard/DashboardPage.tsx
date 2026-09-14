import { Card, Col, Row, Statistic, Typography, Spin } from "antd";
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
} from "@ant-design/icons";
import { useProyectos } from "@/presentation/hooks/useProyectos";
import { useLotes } from "@/presentation/hooks/useLotes";
import { useVentas } from "@/presentation/hooks/useVentas";
import { useCobranzas } from "@/presentation/hooks/useCobranzas";
import { usePagos } from "@/presentation/hooks/usePagos";
import { formatCurrency } from "@/utils";

const { Title } = Typography;

export function DashboardPage() {
  const { data: proyectos, isLoading: loadingProyectos } = useProyectos();
  const { data: lotes, isLoading: loadingLotes } = useLotes();
  const { data: ventas, isLoading: loadingVentas } = useVentas();
  const { data: cobranzas, isLoading: loadingCobranzas } = useCobranzas();
  const { data: pagos, isLoading: loadingPagos } = usePagos();

  const isLoading = loadingProyectos || loadingLotes || loadingVentas || loadingCobranzas || loadingPagos;

  const proyectosActivos = proyectos?.filter((p) => p.estado === "activo").length ?? 0;

  const lotesDisponibles = lotes?.filter((l) => l.estado === "disponible").length ?? 0;
  const lotesReservados = lotes?.filter((l) => l.estado === "reservado").length ?? 0;
  const lotesVendidos = lotes?.filter((l) => l.estado === "vendido").length ?? 0;

  const ventasRealizadas = ventas?.filter((v) => v.estado === "completada").length ?? 0;
  const valorVendido =
    ventas?.filter((v) => v.estado === "completada").reduce((sum, v) => sum + v.precio_final, 0) ?? 0;

  const cobranzaPendiente =
    cobranzas?.filter((c) => c.estado === "pendiente").reduce((sum, c) => sum + c.monto_cuota, 0) ?? 0;
  const cobranzaVencida =
    cobranzas?.filter((c) => c.estado === "vencida").reduce((sum, c) => sum + c.monto_cuota, 0) ?? 0;

  const pagosRecibidos = pagos?.reduce((sum, p) => sum + p.monto_pagado, 0) ?? 0;

  const statCards = [
    {
      title: "Proyectos Activos",
      value: proyectosActivos,
      icon: <ProjectOutlined style={{ fontSize: 24, color: "#1677ff" }} />,
      color: "#e6f4ff",
    },
    {
      title: "Lotes Disponibles",
      value: lotesDisponibles,
      icon: <HomeOutlined style={{ fontSize: 24, color: "#52c41a" }} />,
      color: "#f6ffed",
    },
    {
      title: "Lotes Reservados",
      value: lotesReservados,
      icon: <ClockCircleOutlined style={{ fontSize: 24, color: "#faad14" }} />,
      color: "#fffbe6",
    },
    {
      title: "Lotes Vendidos",
      value: lotesVendidos,
      icon: <CheckCircleOutlined style={{ fontSize: 24, color: "#ff4d4f" }} />,
      color: "#fff2f0",
    },
    {
      title: "Ventas Realizadas",
      value: ventasRealizadas,
      icon: <ShoppingCartOutlined style={{ fontSize: 24, color: "#722ed1" }} />,
      color: "#f9f0ff",
    },
    {
      title: "Valor Vendido",
      value: valorVendido,
      isCurrency: true,
      icon: <DollarOutlined style={{ fontSize: 24, color: "#13c2c2" }} />,
      color: "#e6fffb",
    },
    {
      title: "Cobranza Pendiente",
      value: cobranzaPendiente,
      isCurrency: true,
      icon: <WalletOutlined style={{ fontSize: 24, color: "#faad14" }} />,
      color: "#fffbe6",
    },
    {
      title: "Cobranza Vencida",
      value: cobranzaVencida,
      isCurrency: true,
      icon: <WarningOutlined style={{ fontSize: 24, color: "#ff4d4f" }} />,
      color: "#fff2f0",
    },
    {
      title: "Pagos Recibidos",
      value: pagosRecibidos,
      isCurrency: true,
      icon: <ArrowUpOutlined style={{ fontSize: 24, color: "#52c41a" }} />,
      color: "#f6ffed",
    },
  ];

  if (isLoading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: 120 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <Title level={3} style={{ marginBottom: 24 }}>
        Bienvenido, Administrador
      </Title>

      <Row gutter={[16, 16]}>
        {statCards.map((card) => (
          <Col xs={24} sm={12} lg={8} key={card.title}>
            <Card
              hoverable
              style={{ borderRadius: 8 }}
              styles={{ body: { padding: "20px 24px" } }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 10,
                    background: card.color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {card.icon}
                </div>
                <Statistic
                  title={card.title}
                  value={card.value}
                  precision={card.isCurrency ? 2 : 0}
                  valueStyle={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: card.title === "Cobranza Vencida" ? "#ff4d4f" : undefined,
                  }}
                  formatter={card.isCurrency ? (val) => formatCurrency(val as number) : undefined}
                />
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
