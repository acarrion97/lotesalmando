import { useState } from "react";
import {
  Alert,
  Card,
  Col,
  DatePicker,
  Empty,
  InputNumber,
  Row,
  Select,
  Skeleton,
  Statistic,
  Tabs,
  Tag,
  Typography,
} from "antd";
import dayjs from "dayjs";
import {
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  RiseOutlined,
  WalletOutlined,
} from "@ant-design/icons";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { DataTable } from "@/presentation/components/common/DataTable";
import { useProyeccionFinanciera } from "@/presentation/hooks";
import { formatCurrency } from "@/utils";
import type { TableColumnType, TableProps } from "antd";
import type {
  FilaProyeccion,
  ModeloAbsorcion,
  ProyeccionOpciones,
} from "@/application/proyecciones/dto/ProyeccionFinancieraDto";

const { Text, Title } = Typography;

const MODELOS: { value: ModeloAbsorcion; label: string }[] = [
  { value: "logistic", label: "Logística (base)" },
  { value: "bass", label: "Bass (referidos)" },
  { value: "gompertz", label: "Gompertz (cierre duro)" },
];

function Campo({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Text>
      {children}
      {hint && (
        <Text type="secondary" style={{ fontSize: 11 }}>
          {hint}
        </Text>
      )}
    </div>
  );
}

const money = (v?: number) => formatCurrency(v ?? 0);

/** Mes/año cortos en español ("oct", "2026"), sin punto final ("sept."). */
const FMT_MES = new Intl.DateTimeFormat("es-EC", { month: "short" });
const FMT_ANIO = new Intl.DateTimeFormat("es-EC", { year: "numeric" });
const FMT_PERIODO = new Intl.DateTimeFormat("es-EC", { month: "short", year: "numeric" });
const sinPunto = (s: string) => s.replace(/\.$/, "");

export function ProyeccionFinancieraPage() {
  const [etapaId, setEtapaId] = useState<number | undefined>(undefined);
  const [meses, setMeses] = useState(12);
  const [modelo, setModelo] = useState<ModeloAbsorcion>("logistic");
  const [enganchePct, setEnganchePct] = useState<number | undefined>(undefined);
  const [cuotas, setCuotas] = useState<number | undefined>(undefined);
  const [tasaAnualPct, setTasaAnualPct] = useState(0);
  const [costoUrbTotal, setCostoUrbTotal] = useState(0);
  const [costoVarPct, setCostoVarPct] = useState(0);
  /** Mes de arranque de la proyección (solo presentación: no afecta los cálculos). */
  const [fechaInicio, setFechaInicio] = useState(() => dayjs().startOf("month"));

  const opciones: ProyeccionOpciones = {
    etapaId,
    meses,
    modelo,
    enganchePct,
    cuotas,
    tasaAnualPct,
    costoUrbTotal,
    costoVarPct,
  };

  const { data: proy, isLoading, isError } = useProyeccionFinanciera(opciones);

  /** Fecha calendario del mes N de la proyección (1 = mes de arranque). */
  const fechaDe = (mes: number) => new Date(fechaInicio.year(), fechaInicio.month() + mes - 1, 1);
  /** "oct 2026" para el mes N de la proyección (1 = mes de arranque). */
  const periodoDe = (mes: number) => sinPunto(FMT_PERIODO.format(fechaDe(mes)));

  const colMes: TableColumnType<FilaProyeccion> = {
    title: "Mes",
    dataIndex: "mes",
    width: 112,
    align: "center",
    render: (m: number) => (
      <div>
        <div>{periodoDe(m)}</div>
        <div style={{ fontSize: 11, opacity: 0.55 }}>mes {m}</div>
      </div>
    ),
  };

  const colAbsorcion: TableProps<FilaProyeccion>["columns"] = [
    colMes,
    { title: "Vendidos en el mes", dataIndex: "vendidos", width: 160, align: "center" },
    { title: "Acumulado", dataIndex: "acumVendidos", width: 120, align: "center" },
    { title: "Inventario inicial", dataIndex: "invInicial", width: 150, align: "center" },
    { title: "Inventario restante", dataIndex: "invFinal", width: 160, align: "center" },
  ];

  const colValor: TableProps<FilaProyeccion>["columns"] = [
    colMes,
    {
      title: "Valor contratado del mes",
      dataIndex: "valorMes",
      width: 200,
      align: "right",
      render: (v: number) => money(v),
    },
    {
      title: "Acumulado",
      dataIndex: "valorAcum",
      width: 160,
      align: "right",
      render: (v: number) => <Text strong>{money(v)}</Text>,
    },
  ];

  const colFlujo: TableProps<FilaProyeccion>["columns"] = [
    colMes,
    {
      title: "Enganches",
      dataIndex: "enganches",
      width: 140,
      align: "right",
      render: (v: number) => money(v),
    },
    {
      title: "Mensualidades",
      dataIndex: "mensualidades",
      width: 150,
      align: "right",
      render: (v: number) => money(v),
    },
    {
      title: "Ingreso total",
      dataIndex: "ingresoMes",
      width: 150,
      align: "right",
      render: (v: number) => <Text strong>{money(v)}</Text>,
    },
    {
      title: "Ingreso acumulado",
      dataIndex: "ingresoAcum",
      width: 170,
      align: "right",
      render: (v: number) => money(v),
    },
  ];

  const colNeto: TableProps<FilaProyeccion>["columns"] = [
    colMes,
    {
      title: "Ingresos",
      dataIndex: "ingresoMes",
      width: 140,
      align: "right",
      render: (v: number) => money(v),
    },
    {
      title: "Costos",
      dataIndex: "costoMes",
      width: 140,
      align: "right",
      render: (v: number) => money(v),
    },
    {
      title: "Neto del mes",
      dataIndex: "netoMes",
      width: 150,
      align: "right",
      render: (v: number) => (
        <Text style={{ color: v >= 0 ? "#52c41a" : "#ff4d4f" }} strong>
          {money(v)}
        </Text>
      ),
    },
    {
      title: "Neto acumulado",
      dataIndex: "netoAcum",
      width: 170,
      align: "right",
      render: (v: number) => <Text strong>{money(v)}</Text>,
    },
  ];

  if (isError) {
    return (
      <div>
        <PageToolbar
          title="Proyección Financiera"
          subtitle="Absorción, valor contratado y flujo de caja"
        />
        <Alert type="error" showIcon message="No se pudo calcular la proyección." />
      </div>
    );
  }

  if (isLoading && !proy) {
    return (
      <div>
        <PageToolbar
          title="Proyección Financiera"
          subtitle="Absorción, valor contratado y flujo de caja"
        />
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    );
  }

  if (!proy) {
    return (
      <div>
        <PageToolbar
          title="Proyección Financiera"
          subtitle="Absorción, valor contratado y flujo de caja"
        />
        <Empty description="Sin datos de lotes para proyectar" />
      </div>
    );
  }

  const { resumen, filas, metricas, etapasDisponibles, esquemaReal } = proy;
  const maxVend = Math.max(...filas.map((f) => f.vendidos), 1);

  const tarjetas = [
    {
      title: "Valor contratado total",
      value: money(metricas.valorContratadoTotal),
      icon: <FileTextOutlined style={{ color: "#1677ff" }} />,
    },
    {
      title: "Ingreso de caja total",
      value: money(metricas.ingresoTotal),
      icon: <DollarOutlined style={{ color: "#52c41a" }} />,
    },
    {
      title: "Costos totales",
      value: money(metricas.costoTotal),
      icon: <WalletOutlined style={{ color: "#faad14" }} />,
    },
    {
      title: "Flujo neto total",
      value: money(metricas.netoTotal),
      icon: <RiseOutlined style={{ color: metricas.netoTotal >= 0 ? "#52c41a" : "#ff4d4f" }} />,
    },
    {
      title: metricas.paybackMes ? `Payback (${periodoDe(metricas.paybackMes)})` : "Payback",
      value: metricas.paybackMes ? `Mes ${metricas.paybackMes}` : "—",
      icon: <ClockCircleOutlined style={{ color: "#722ed1" }} />,
    },
    {
      title: "TIR anual",
      value: metricas.tirAnual !== null ? `${(metricas.tirAnual * 100).toFixed(1)}%` : "—",
      icon: <RiseOutlined style={{ color: "#13c2c2" }} />,
    },
  ];

  const tabs = [
    {
      key: "absorcion",
      label: "Absorción",
      children: (
        <DataTable<FilaProyeccion>
          columns={colAbsorcion}
          dataSource={filas}
          rowKey="mes"
          pagination={false}
        />
      ),
    },
    {
      key: "valor",
      label: "Valor contratado",
      children: (
        <DataTable<FilaProyeccion>
          columns={colValor}
          dataSource={filas}
          rowKey="mes"
          pagination={false}
        />
      ),
    },
    {
      key: "flujo",
      label: "Flujo de caja",
      children: (
        <DataTable<FilaProyeccion>
          columns={colFlujo}
          dataSource={filas}
          rowKey="mes"
          pagination={false}
        />
      ),
    },
    {
      key: "neto",
      label: "Flujo neto",
      children: (
        <DataTable<FilaProyeccion>
          columns={colNeto}
          dataSource={filas}
          rowKey="mes"
          pagination={false}
        />
      ),
    },
  ];

  return (
    <div>
      <PageToolbar
        title="Proyección Financiera"
        subtitle={`${resumen.nombreEtapa} · ${resumen.porProyectar} lotes por vender de ${resumen.totalLotes}`}
        extra={<Tag color="blue">Datos reales de Supabase</Tag>}
      />

      {/* Parámetros */}
      <Card style={{ borderRadius: 10, marginBottom: 16 }}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Campo label="Etapa">
              <Select
                value={etapaId ?? resumen.idEtapa}
                onChange={(v) => setEtapaId(v)}
                style={{ width: "100%" }}
                options={etapasDisponibles.map((e) => ({
                  value: e.id_etapa,
                  label: `${e.nombre} (${e.lotes})`,
                }))}
              />
            </Campo>
          </Col>
          <Col xs={24} sm={12} md={8} lg={5}>
            <Campo label="Modelo de absorción">
              <Select
                value={modelo}
                onChange={(v) => setModelo(v)}
                style={{ width: "100%" }}
                options={MODELOS}
              />
            </Campo>
          </Col>
          <Col xs={12} sm={8} md={6} lg={3}>
            <Campo label="Horizonte (meses)">
              <InputNumber
                value={meses}
                onChange={(v) => setMeses(v ?? 12)}
                min={1}
                max={120}
                style={{ width: "100%" }}
              />
            </Campo>
          </Col>
          <Col xs={12} sm={8} md={6} lg={4}>
            <Campo label="Fecha inicial" hint="Primer mes de la proyección">
              <DatePicker
                picker="month"
                format="MM/YYYY"
                allowClear={false}
                value={fechaInicio}
                onChange={(v) => v && setFechaInicio(v.startOf("month"))}
                style={{ width: "100%" }}
              />
            </Campo>
          </Col>
          <Col xs={12} sm={8} md={6} lg={3}>
            <Campo label="Enganche (%)" hint={`Real: ${esquemaReal.enganchePct}%`}>
              <InputNumber
                value={enganchePct}
                onChange={(v) => setEnganchePct(v ?? undefined)}
                min={0}
                max={100}
                step={0.5}
                placeholder={`${esquemaReal.enganchePct}%`}
                style={{ width: "100%" }}
              />
            </Campo>
          </Col>
          <Col xs={12} sm={8} md={6} lg={3}>
            <Campo label="Cuotas" hint={`Real: ${esquemaReal.cuotas}`}>
              <InputNumber
                value={cuotas}
                onChange={(v) => setCuotas(v ?? undefined)}
                min={1}
                max={240}
                placeholder={`${esquemaReal.cuotas}`}
                style={{ width: "100%" }}
              />
            </Campo>
          </Col>
          <Col xs={12} sm={8} md={6} lg={3}>
            <Campo label="Interés anual (%)">
              <InputNumber
                value={tasaAnualPct}
                onChange={(v) => setTasaAnualPct(v ?? 0)}
                min={0}
                max={100}
                step={0.5}
                style={{ width: "100%" }}
              />
            </Campo>
          </Col>
          <Col xs={12} sm={8} md={6} lg={3}>
            <Campo label="Urbanización (inversión)">
              <InputNumber
                value={costoUrbTotal}
                onChange={(v) => setCostoUrbTotal(v ?? 0)}
                min={0}
                step={1000}
                style={{ width: "100%" }}
              />
            </Campo>
          </Col>
          <Col xs={12} sm={8} md={6} lg={3}>
            <Campo label="Costo variable (%)" hint="sobre el ingreso">
              <InputNumber
                value={costoVarPct}
                onChange={(v) => setCostoVarPct(v ?? 0)}
                min={0}
                max={100}
                step={0.5}
                style={{ width: "100%" }}
              />
            </Campo>
          </Col>
        </Row>
      </Card>

      {/* Tarjetas de resumen */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {tarjetas.map((t) => (
          <Col xs={12} sm={12} lg={4} key={t.title}>
            <Card
              hoverable
              style={{ borderRadius: 10 }}
              styles={{ body: { padding: "16px 20px" } }}
            >
              <Statistic
                title={t.title}
                value={t.value}
                prefix={t.icon}
                styles={{ content: { fontSize: 20, fontWeight: 700 } }}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Curva de absorción */}
      <Card
        title="Curva de absorción (lotes vendidos por mes)"
        style={{ borderRadius: 10, marginBottom: 16 }}
        extra={
          <Text type="secondary" style={{ fontSize: 12 }}>
            Precio prom. {money(resumen.precioPromedio)} · cuota {money(resumen.cuotaMensual)} ·{" "}
            {resumen.cuotas} cuotas · {resumen.tasaAnualPct}% interés
          </Text>
        }
      >
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
          {filas.map((f) => (
            <div
              key={f.mes}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Text style={{ fontSize: 11 }}>{f.vendidos}</Text>
              <div style={{ width: "100%", height: 90, display: "flex", alignItems: "flex-end" }}>
                <div
                  style={{
                    width: "100%",
                    height: `${Math.max((f.vendidos / maxVend) * 100, 3)}%`,
                    background: "linear-gradient(180deg, #69b1ff, #1677ff)",
                    borderRadius: "4px 4px 0 0",
                  }}
                />
              </div>
              <div
                style={{
                  width: "100%",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Text type="secondary" style={{ fontSize: 10, lineHeight: 1.15 }}>
                  {sinPunto(FMT_MES.format(fechaDe(f.mes)))}
                </Text>
                <Text type="secondary" style={{ fontSize: 10, lineHeight: 1.15 }}>
                  {FMT_ANIO.format(fechaDe(f.mes))}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tablas */}
      <Card style={{ borderRadius: 10 }}>
        <Title level={5} style={{ marginTop: 0 }}>
          Proyección detallada
        </Title>
        <Tabs defaultActiveKey="absorcion" items={tabs} />
      </Card>
    </div>
  );
}
