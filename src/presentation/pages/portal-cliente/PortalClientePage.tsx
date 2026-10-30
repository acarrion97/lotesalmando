import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Input,
  Result,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from "antd";
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import type { TableColumnType } from "antd";
import type { PortalCuota } from "@/domain/portal/entities";
import { usePortalCliente } from "@/presentation/hooks";
import {
  ModalEnvioComprobante,
  type EnvioComprobante,
} from "@/presentation/components/publicos/ModalEnvioComprobante";
import { formatCurrency, formatDateOnly } from "@/utils";

const { Title, Text, Paragraph } = Typography;

const ESTADO_CUOTA: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  pagada: { color: "green", label: "Pagada", icon: <CheckCircleOutlined /> },
  vencida: { color: "red", label: "Vencida", icon: <ExclamationCircleOutlined /> },
  pendiente: { color: "gold", label: "Pendiente", icon: <ClockCircleOutlined /> },
};

const ESTADO_COMPROBANTE: Record<string, { color: string; label: string }> = {
  pendiente: { color: "blue", label: "En revisión" },
  aprobado: { color: "green", label: "Aprobado" },
  rechazado: { color: "red", label: "Rechazado" },
};

/**
 * Portal del cliente (público, sin sesión): entra con su número de
 * identificación, ve sus cuotas y envía el comprobante de pago (imagen o
 * PDF) con el valor que pagó. La cuota no cambia de estado sola: queda
 * pendiente de revisión.
 */
export function PortalClientePage() {
  const { cedula, setCedula, consulta, enviarComprobante } = usePortalCliente();
  const [datos, setDatos] = useState<Awaited<ReturnType<typeof consulta.mutateAsync>> | null>(null);
  const [cuota, setCuota] = useState<EnvioComprobante | null>(null);
  const [proyectoFilter, setProyectoFilter] = useState<string | null>(null);

  const buscar = () => {
    if (!cedula.trim()) return;
    consulta.mutate(cedula.trim(), {
      onSuccess: (resultado) => {
        setDatos(resultado);
        setProyectoFilter(null);
      },
    });
  };

  const columnas: TableColumnType<PortalCuota>[] = [
    {
      title: "Cuota",
      dataIndex: "numero_cuota",
      key: "numero_cuota",
      width: 90,
      render: (n: number) => <Text strong>#{n}</Text>,
    },
    {
      title: "Monto",
      dataIndex: "monto_cuota",
      key: "monto_cuota",
      render: (valor: number) => formatCurrency(valor),
    },
    {
      title: "Vence",
      dataIndex: "fecha_vencimiento",
      key: "fecha_vencimiento",
      render: (fecha: string | null) => (fecha ? formatDateOnly(fecha.slice(0, 10)) : "-"),
    },
    {
      title: "Estado",
      dataIndex: "estado",
      key: "estado",
      render: (estado: string) => {
        const info = ESTADO_CUOTA[estado] ?? { color: "default", label: estado, icon: null };
        return (
          <Tag color={info.color} icon={info.icon}>
            {info.label}
          </Tag>
        );
      },
    },
    {
      title: "Comprobante",
      key: "comprobante",
      render: (_: unknown, record: PortalCuota) =>
        record.comprobante ? (
          <Space direction="vertical" size={2}>
            <Tag color={ESTADO_COMPROBANTE[record.comprobante.estado]?.color ?? "default"}>
              {ESTADO_COMPROBANTE[record.comprobante.estado]?.label ?? record.comprobante.estado}
            </Tag>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {formatCurrency(record.comprobante.monto_pagado)} ·{" "}
              {record.comprobante.fecha ? formatDateOnly(record.comprobante.fecha.slice(0, 10)) : ""}
            </Text>
            {record.comprobante.estado === "rechazado" && record.comprobante.nota && (
              <Text type="danger" style={{ fontSize: 12 }}>
                {record.comprobante.nota}
              </Text>
            )}
          </Space>
        ) : (
          <Text type="secondary">-</Text>
        ),
    },
    {
      title: "",
      key: "accion",
      width: 150,
      render: (_: unknown, record: PortalCuota) =>
        record.estado === "pagada" ? null : (
          <Button
            size="small"
            type="primary"
            ghost
            icon={<UploadOutlined />}
            onClick={() =>
              setCuota({
                idCobranza: record.id_cobranza,
                numeroCuota: record.numero_cuota,
                montoCuota: record.monto_cuota,
              })
            }
          >
            Comprobante
          </Button>
        ),
    },
  ];

  const cliente = datos?.clientes[0];
  const proyectosCliente = Array.from(
    new Set(
      (cliente?.contratos ?? []).flatMap((contrato) =>
        contrato.proyecto ? [contrato.proyecto] : [],
      ),
    ),
  );
  const contratosFiltrados =
    cliente?.contratos.filter(
      (contrato) => proyectoFilter === null || contrato.proyecto === proyectoFilter,
    ) ?? [];

  return (
    <div style={{ minHeight: "100vh", background: "#f4f7f9", padding: "32px 16px" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Title level={3} style={{ marginBottom: 4 }}>
            Lotes al Mando
          </Title>
          <Text type="secondary">Consulta tus cuotas y envía tu comprobante de pago</Text>
        </div>

        <Card style={{ borderRadius: 12 }}>
          <Space.Compact style={{ width: "100%" }}>
            <Input
              size="large"
              prefix={<UserOutlined />}
              placeholder="Escribí tu número de identificación (cédula)"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              onPressEnter={buscar}
              maxLength={20}
            />
            <Button
              type="primary"
              size="large"
              loading={consulta.isPending}
              onClick={buscar}
              style={{ minWidth: 130 }}
            >
              Consultar
            </Button>
          </Space.Compact>
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 8 }}>
            Solo necesitás tu número de identificación. No hace falta crear cuenta.
          </Text>
        </Card>

        {consulta.isPending && (
          <div style={{ textAlign: "center", padding: 48 }}>
            <Spin size="large" />
          </div>
        )}

        {!consulta.isPending && datos && !datos.existe && (
          <Result
            style={{ marginTop: 24 }}
            status="warning"
            title="No encontramos esa identificación"
            subTitle="Revisá el número. Si tu lote ya fue comprado, el contrato figura con tu cédula."
          />
        )}

        {!consulta.isPending && cliente && (
          <div style={{ marginTop: 24 }}>
            <Card style={{ borderRadius: 12, marginBottom: 16 }}>
              <Space direction="vertical" size={4}>
                <Title level={5} style={{ margin: 0 }}>
                  Hola, {cliente.nombres}
                </Title>
                <Text type="secondary">
                  {contratosFiltrados.length === 0
                    ? proyectoFilter
                      ? "No tenés contratos asociados a este proyecto."
                      : "Todavía no tenés contratos registrados."
                    : `${contratosFiltrados.length} contrato(s) con cuotas registradas.`}
                </Text>
                {proyectosCliente.length > 1 && (
                  <Select
                    allowClear
                    placeholder="Todos los proyectos"
                    value={proyectoFilter ?? undefined}
                    onChange={(value) => setProyectoFilter(value ?? null)}
                    options={proyectosCliente.map((proyecto) => ({
                      value: proyecto,
                      label: proyecto,
                    }))}
                    style={{ width: 240 }}
                  />
                )}
              </Space>
            </Card>

            {contratosFiltrados.map((contrato) => (
              <Card
                key={contrato.id_contrato}
                style={{ borderRadius: 12, marginBottom: 16 }}
                title={
                  <Space wrap>
                    <FileTextOutlined />
                    <span>Contrato {contrato.numero_contrato}</span>
                    {contrato.lote && <Tag color="blue">{contrato.lote}</Tag>}
                    {contrato.proyecto && <Tag>{contrato.proyecto}</Tag>}
                  </Space>
                }
                extra={<Text strong>{formatCurrency(contrato.monto_total)}</Text>}
              >
                {contrato.cuotas.length === 0 ? (
                  <Empty description="Este contrato no tiene cuotas registradas" />
                ) : (
                  <Table
                    rowKey="id_cobranza"
                    size="small"
                    columns={columnas}
                    dataSource={contrato.cuotas}
                    pagination={false}
                    scroll={{ x: 720 }}
                  />
                )}
              </Card>
            ))}

            <Alert
              type="info"
              showIcon
              message="¿Tu cuota se venció?"
              description={
                <Paragraph style={{ marginBottom: 0 }}>
                  Envianos el comprobante de pago (foto o PDF) con el valor que pagaste. Queda
                  pendiente de revisión y te confirmamos por correo. Si tenés dudas, escribinos.
                </Paragraph>
              }
            />
          </div>
        )}
      </div>

      <ModalEnvioComprobante
        open={!!cuota}
        cuota={cuota}
        enviando={enviarComprobante.isPending}
        onClose={() => setCuota(null)}
        onEnviar={(datosEnvio) => {
          enviarComprobante.mutate(datosEnvio, {
            onSuccess: (resultado) => {
              if (resultado.ok) {
                setCuota(null);
                // Se vuelve a consultar para ver la cuota con el comprobante nuevo.
                consulta.mutate(cedula.trim(), { onSuccess: (r) => setDatos(r) });
              }
            },
          });
        }}
      />
    </div>
  );
}
