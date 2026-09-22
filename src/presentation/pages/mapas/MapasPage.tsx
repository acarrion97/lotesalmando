import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Typography, Tag, Button, Modal, Descriptions, Select, Row, Col, Card, Statistic, Form, InputNumber, Input, Steps, message, Timeline, Alert, Spin, Empty } from "antd";
import type { Lote } from "@/domain/lote/entities/Lote";
import type { Etapa } from "@/domain/etapa/entities/Etapa";
import type { Manzana } from "@/domain/manzana/entities/Manzana";
import {
  HomeOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  StopOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  EnvironmentOutlined,
  DollarOutlined,
  BookOutlined,
  HistoryOutlined,
  FileTextOutlined,
  UserOutlined,
  MailOutlined,
  PhoneOutlined,
} from "@ant-design/icons";
import { useProyectos, useClientes, useEtapasByProyecto, useManzanasByEtapa, useLotesByManzana, useReservarLote, useCreateVenta, useOnlineStatus } from "@/presentation/hooks";
import { useAuth } from "@/presentation/providers";
import { useEmpresa } from "@/presentation/providers/EmpresaProvider";
import { getContainer } from "@/infrastructure/container";
import { FreshnessBadge } from "@/presentation/components/common/FreshnessBadge";
import { classifyFreshness } from "@/infrastructure/offline/freshness";

async function findOrCreateCliente(nombres: string, cedula_ruc: string, email: string) {
  const container = getContainer();
  const clientes = await container.getClientes.execute(0);
  const existing = clientes.find((c) => c.email === email || c.cedula_ruc === cedula_ruc);
  if (existing) return existing;
  return container.createCliente.execute({ nombres, cedula_ruc, email });
}

const { Title, Text } = Typography;

const estadoConfig: Record<string, { color: string; bg: string; border: string; label: string; icon: React.ReactNode }> = {
  disponible: { color: "#52c41a", bg: "rgba(82, 196, 26, 0.3)", border: "#52c41a", label: "Disponible", icon: <CheckCircleOutlined /> },
  reservado: { color: "#faad14", bg: "rgba(250, 173, 20, 0.3)", border: "#faad14", label: "Reservado", icon: <ClockCircleOutlined /> },
  vendido: { color: "#a0522d", bg: "rgba(160, 82, 45, 0.35)", border: "#a0522d", label: "Vendido", icon: <StopOutlined /> },
  en_negociacion: { color: "#1677ff", bg: "rgba(22, 119, 255, 0.3)", border: "#1677ff", label: "En Negociacion", icon: <ClockCircleOutlined /> },
  bloqueado: { color: "#8c8c8c", bg: "rgba(140, 140, 140, 0.3)", border: "#8c8c8c", label: "Bloqueado", icon: <StopOutlined /> },
  no_disponible: { color: "#8c8c8c", bg: "rgba(140, 140, 140, 0.3)", border: "#8c8c8c", label: "No Disponible", icon: <StopOutlined /> },
};

type PositionedLote = Lote & {
  x: number;
  y: number;
  width: number;
  height: number;
};

function getLotePosition(index: number, total: number) {
  const cols = Math.ceil(Math.sqrt(total));
  const col = index % cols;
  const row = Math.floor(index / cols);
  const cellW = 80 / cols;
  const cellH = 70 / Math.ceil(total / cols);
  return {
    x: 5 + col * cellW,
    y: 10 + row * cellH,
    width: cellW * 0.9,
    height: cellH * 0.85,
  };
}

type ModalType = "detail" | "cotizar" | "reservar" | "venta" | "historial" | null;

export function MapasPage() {
  const [selectedProyecto, setSelectedProyecto] = useState<number | null>(null);
  const [selectedEtapa, setSelectedEtapa] = useState<number | null>(null);
  const [selectedManzana, setSelectedManzana] = useState<number | null>(null);
  const [selectedLote, setSelectedLote] = useState<PositionedLote | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [cotizacionStep, setCotizacionStep] = useState(0);
  const [reservaStep, setReservaStep] = useState(0);
  const [ventaStep, setVentaStep] = useState(0);
  const [selectedCliente, setSelectedCliente] = useState<number | null>(null);
  const [ventaClienteInfo, setVentaClienteInfo] = useState<{
    cliente_nombre: string;
    cliente_cedula: string;
    cliente_email: string;
  } | null>(null);
  const [ventaSubmitting, setVentaSubmitting] = useState(false);
  const [reservaSubmitting, setReservaSubmitting] = useState(false);
  const [cotizacionForm] = Form.useForm();
  const [reservaForm] = Form.useForm();
  const [ventaForm] = Form.useForm();
  const [ventaClienteForm] = Form.useForm();

  const { user } = useAuth();
  const queryClient = useQueryClient();
  const reservarLoteMutation = useReservarLote();
  const createVentaMutation = useCreateVenta();
  const isOnline = useOnlineStatus();

  const { empresaActual } = useEmpresa();
  const { data: clientes, isLoading: loadingClientes } = useClientes(empresaActual?.id_empresa ?? 0);
  const { data: proyectos, isLoading: loadingProyectos } = useProyectos();
  const { data: etapas, isLoading: loadingEtapas } = useEtapasByProyecto(selectedProyecto ?? 0);
  const { data: manzanasData, isLoading: loadingManzanas } = useManzanasByEtapa(selectedEtapa ?? 0);
  const { data: lotesData, isLoading: loadingLotes, dataUpdatedAt: lotesUpdatedAt } = useLotesByManzana(selectedManzana ?? 0);

  const currentProyecto = useMemo(() => {
    if (!proyectos || !selectedProyecto) return null;
    return proyectos.find((p) => p.id_proyecto === selectedProyecto) ?? null;
  }, [proyectos, selectedProyecto]);

  const lotesConPosicion = useMemo<PositionedLote[]>(() => {
    if (!lotesData) return [];
    return lotesData.map((lote: Lote, index: number) => {
      const pos = getLotePosition(index, lotesData.length);
      return { ...lote, ...pos };
    });
  }, [lotesData]);

  const stats = useMemo(() => {
    if (!lotesData) return { total: 0, disponibles: 0, reservados: 0, vendidos: 0 };
    return {
      total: lotesData.length,
      disponibles: lotesData.filter((l: Lote) => l.estado === "disponible").length,
      reservados: lotesData.filter((l: Lote) => l.estado === "reservado").length,
      vendidos: lotesData.filter((l: Lote) => l.estado === "vendido").length,
    };
  }, [lotesData]);

  const isLoading = loadingProyectos || loadingEtapas || loadingManzanas || loadingLotes;
  const isVeryStale = classifyFreshness(lotesUpdatedAt) === "very-stale";
  const commercialActionBlockedReason = !isOnline
    ? "Sin conexión: no se pueden realizar acciones comerciales"
    : isVeryStale
      ? "Datos muy desactualizados: reconecte y actualice antes de continuar"
      : null;

  const openModal = (type: ModalType) => {
    if ((type === "cotizar" || type === "reservar" || type === "venta") && commercialActionBlockedReason) {
      message.error(commercialActionBlockedReason);
      return;
    }
    setModalType(type);
    if (type === "cotizar") {
      setCotizacionStep(0);
      setSelectedCliente(null);
      cotizacionForm.resetFields();
    }
    if (type === "reservar") {
      setReservaStep(0);
      reservaForm.resetFields();
    }
    if (type === "venta") {
      setVentaStep(0);
      setSelectedCliente(null);
      setVentaClienteInfo(null);
      ventaForm.resetFields();
      ventaClienteForm.resetFields();
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedLote(null);
  };

  const handleLoteClick = (lote: PositionedLote) => {
    setSelectedLote(lote);
    openModal("detail");
  };

  const navigateLote = (direction: "prev" | "next") => {
    if (!selectedLote || !lotesConPosicion.length) return;
    const currentIndex = lotesConPosicion.findIndex((l: PositionedLote) => l.id_lote === selectedLote.id_lote);
    const newIndex = direction === "next"
      ? (currentIndex + 1) % lotesConPosicion.length
      : (currentIndex - 1 + lotesConPosicion.length) % lotesConPosicion.length;
    setSelectedLote(lotesConPosicion[newIndex]);
  };

  const handleCotizar = () => {
    if (cotizacionStep === 0) {
      if (!selectedCliente) { message.warning("Seleccione un cliente"); return; }
      setCotizacionStep(1);
    } else {
      cotizacionForm.validateFields().then((values) => {
        message.success(`Cotizacion $${values.precio_ofertado.toLocaleString()} creada para Lote ${selectedLote?.numero_lote}`);
        closeModal();
      });
    }
  };

  const handleReservar = () => {
    if (reservaStep === 0) { setReservaStep(1); return; }
    reservaForm.validateFields().then(async (values) => {
      if (!selectedLote || !user?.id_usuario) {
        message.error("No se pudo identificar el usuario actual");
        return;
      }
      setReservaSubmitting(true);
      try {
        await findOrCreateCliente(values.cliente_nombre, values.cliente_cedula, values.cliente_email);
        queryClient.invalidateQueries({ queryKey: ["clientes"] });
        await reservarLoteMutation.mutateAsync({ loteId: selectedLote.id_lote, usuarioId: user.id_usuario });
        message.success(`Lote ${selectedLote.numero_lote} reservado correctamente`);
        closeModal();
      } catch (err) {
        message.error(err instanceof Error ? err.message : "Error al reservar el lote");
      } finally {
        setReservaSubmitting(false);
      }
    });
  };

  const handleVenta = () => {
    if (ventaStep === 0) {
      ventaClienteForm.validateFields().then((values) => {
        setVentaClienteInfo({
          cliente_nombre: values.cliente_nombre,
          cliente_cedula: values.cliente_cedula,
          cliente_email: values.cliente_email,
        });
        setVentaStep(1);
      });
    } else if (ventaStep === 1) {
      ventaForm.validateFields().then(() => setVentaStep(2));
    } else {
      if (!selectedLote || !user?.id_usuario || !ventaClienteInfo) {
        message.error("No se pudo identificar el usuario o el cliente");
        return;
      }
      const lote = selectedLote;
      const usuarioId = user.id_usuario;
      const clienteInfo = ventaClienteInfo;
      setVentaSubmitting(true);
      (async () => {
        try {
          const cliente = await findOrCreateCliente(
            clienteInfo.cliente_nombre,
            clienteInfo.cliente_cedula,
            clienteInfo.cliente_email,
          );
          queryClient.invalidateQueries({ queryKey: ["clientes"] });

          const precioOfertado = lote.precio_lista ?? 0;
          const container = getContainer();
          const cotizacion = await container.createCotizacion.execute({
            id_cliente: cliente.id_cliente,
            id_lote: lote.id_lote,
            precio_ofertado: precioOfertado,
            estado: "aceptada",
          });

          await createVentaMutation.mutateAsync({
            id_cliente: cliente.id_cliente,
            id_lote: lote.id_lote,
            id_cotizacion: cotizacion.id_cotizacion,
            precio_ofertado: precioOfertado,
            id_usuario: usuarioId,
          });

          message.success(`Venta de Lote ${lote.numero_lote} registrada correctamente`);
          closeModal();
        } catch (err) {
          message.error(err instanceof Error ? err.message : "Error al registrar la venta");
        } finally {
          setVentaSubmitting(false);
        }
      })();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <EnvironmentOutlined style={{ marginRight: 8 }} />
          Mapa de Lotes
        </Title>
        <Text type="secondary">Seleccione proyecto, etapa y manzana para ver el mapa</Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Select
            placeholder="Seleccionar Proyecto"
            style={{ width: "100%" }}
            size="large"
            loading={loadingProyectos}
            value={selectedProyecto}
            onChange={(v) => { setSelectedProyecto(v); setSelectedEtapa(null); setSelectedManzana(null); }}
            options={(proyectos ?? []).map((p) => ({ value: p.id_proyecto, label: p.nombre }))}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Select
            placeholder="Seleccionar Etapa"
            style={{ width: "100%" }}
            size="large"
            loading={loadingEtapas}
            disabled={!selectedProyecto}
            value={selectedEtapa}
            onChange={(v) => { setSelectedEtapa(v); setSelectedManzana(null); }}
            options={(etapas ?? []).map((e: Etapa) => ({ value: e.id_etapa, label: e.nombre }))}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Select
            placeholder="Seleccionar Manzana"
            style={{ width: "100%" }}
            size="large"
            loading={loadingManzanas}
            disabled={!selectedEtapa}
            value={selectedManzana}
            onChange={setSelectedManzana}
            options={(manzanasData ?? []).map((m: Manzana) => ({ value: m.id_manzana, label: m.nombre_codigo ?? `Manzana ${m.id_manzana}` }))}
          />
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Total</span>} value={stats.total} styles={{ content: { fontWeight: 700, fontSize: 22 } }} prefix={<HomeOutlined style={{ color: "#1677ff" }} />} />
          </Card>
        </Col>
        <Col xs={8} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #b7eb8f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Disponibles</span>} value={stats.disponibles} styles={{ content: { fontWeight: 700, fontSize: 18, color: "#52c41a" } }} />
          </Card>
        </Col>
        <Col xs={8} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffe58f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Reservados</span>} value={stats.reservados} styles={{ content: { fontWeight: 700, fontSize: 18, color: "#faad14" } }} />
          </Card>
        </Col>
        <Col xs={8} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #d9b8a8" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Vendidos</span>} value={stats.vendidos} styles={{ content: { fontWeight: 700, fontSize: 18, color: "#a0522d" } }} />
          </Card>
        </Col>
      </Row>

      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {Object.entries(estadoConfig).map(([key, config]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#fff", borderRadius: 6, border: "1px solid #f0f0f0", fontSize: 12 }}>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: config.bg, border: `2px solid ${config.border}` }} />
            <span style={{ fontSize: 12 }}>{config.label}</span>
          </div>
        ))}
      </div>

      <Card style={{ borderRadius: 12, overflow: "hidden" }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" }}>
          <div>
            <Text strong style={{ fontSize: 15 }}>{currentProyecto?.nombre ?? "Seleccione un proyecto"}</Text>
            {selectedManzana && <Text type="secondary" style={{ marginLeft: 12, fontSize: 13 }}>{lotesData?.length ?? 0} lotes</Text>}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {selectedManzana && lotesData && <FreshnessBadge dataUpdatedAt={lotesUpdatedAt} />}
            <BookOutlined style={{ color: "#8c8c8c" }} />
          </div>
        </div>

        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
            <Spin size="large" />
          </div>
        ) : !selectedManzana ? (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}>
            <Empty description="Seleccione un proyecto, etapa y manzana para ver el mapa" />
          </div>
        ) : (
          <div style={{ position: "relative", width: "100%", minHeight: 280, paddingBottom: "min(60%, 520px)", overflow: "hidden", background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)" }}>
            {lotesConPosicion.map((lote: PositionedLote) => {
              const config = estadoConfig[lote.estado] ?? estadoConfig.disponible;
              return (
                <button
                  key={lote.id_lote}
                  onClick={() => handleLoteClick(lote)}
                  style={{
                    position: "absolute",
                    left: `${lote.x}%`,
                    top: `${lote.y}%`,
                    width: `${Math.max(lote.width, 12)}%`,
                    height: `${Math.max(lote.height, 12)}%`,
                    background: config.bg,
                    border: `2px solid ${config.border}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    padding: 0,
                    outline: "none",
                    backdropFilter: "blur(2px)",
                    minWidth: 26,
                    minHeight: 26,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "scale(1.05)";
                    e.currentTarget.style.zIndex = "10";
                    e.currentTarget.style.boxShadow = `0 6px 20px ${config.color}60`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "scale(1)";
                    e.currentTarget.style.zIndex = "1";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <HomeOutlined style={{ color: "#fff", fontSize: 14, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }} />
                  <span style={{ color: "#fff", fontWeight: 700, fontSize: 11, lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{lote.numero_lote}</span>
                  <span style={{ color: "#fff", fontSize: 9, opacity: 0.9, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>${lote.precio_lista?.toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal Detalle */}
      <Modal
        open={modalType === "detail" && !!selectedLote}
        onCancel={closeModal}
        footer={null}
        width={480}
        centered
        title={selectedLote && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: (estadoConfig[selectedLote.estado] ?? estadoConfig.disponible).bg, border: `2px solid ${(estadoConfig[selectedLote.estado] ?? estadoConfig.disponible).border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HomeOutlined style={{ color: (estadoConfig[selectedLote.estado] ?? estadoConfig.disponible).color, fontSize: 22 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Lote {selectedLote.numero_lote}</div>
              <Tag color={(estadoConfig[selectedLote.estado] ?? estadoConfig.disponible).color} icon={(estadoConfig[selectedLote.estado] ?? estadoConfig.disponible).icon}>{(estadoConfig[selectedLote.estado] ?? estadoConfig.disponible).label}</Tag>
            </div>
          </div>
        )}
      >
        {selectedLote && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Numero">{selectedLote.numero_lote}</Descriptions.Item>
              <Descriptions.Item label="Manzana">{selectedLote.id_manzana}</Descriptions.Item>
              <Descriptions.Item label="Precio Lista" span={2}>
                <span style={{ fontWeight: 700, fontSize: 18, color: "#1677ff" }}>${selectedLote.precio_lista?.toLocaleString()}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Estado" span={2}>
                <Tag color={(estadoConfig[selectedLote.estado] ?? estadoConfig.disponible).color} icon={(estadoConfig[selectedLote.estado] ?? estadoConfig.disponible).icon}>{(estadoConfig[selectedLote.estado] ?? estadoConfig.disponible).label}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Precio y estado según la última sincronización, no una garantía en tiempo real.
              </Text>
              <FreshnessBadge dataUpdatedAt={lotesUpdatedAt} />
            </div>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigateLote("prev")} style={{ flex: 1 }}>Anterior</Button>
              <Button icon={<ArrowRightOutlined />} onClick={() => navigateLote("next")} style={{ flex: 1 }}>Siguiente</Button>
            </div>

            {commercialActionBlockedReason && (
              <Alert
                message={commercialActionBlockedReason}
                description={!isOnline ? "Vuelva a conectarse para cotizar, reservar o vender este lote." : "Reconecte y actualice antes de cotizar, reservar o vender este lote."}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedLote.estado === "disponible" && (
                <>
                  <Button type="primary" block size="large" icon={<FileTextOutlined />} disabled={!!commercialActionBlockedReason} onClick={() => openModal("cotizar")}>Cotizar Lote</Button>
                  <Button block size="large" disabled={!!commercialActionBlockedReason} style={{ borderColor: "#faad14", color: "#faad14" }} icon={<ClockCircleOutlined />} onClick={() => openModal("reservar")}>Reservar Lote</Button>
                </>
              )}
              {selectedLote.estado === "reservado" && (
                <Button type="primary" block size="large" icon={<DollarOutlined />} disabled={!!commercialActionBlockedReason} onClick={() => openModal("venta")}>Crear Venta</Button>
              )}
              <Button block icon={<HistoryOutlined />} onClick={() => openModal("historial")}>Ver historial</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Cotizar */}
      <Modal
        open={modalType === "cotizar"}
        onCancel={closeModal}
        width={520}
        centered
        title={<div style={{ display: "flex", alignItems: "center", gap: 12 }}><FileTextOutlined style={{ fontSize: 20, color: "#1677ff" }} /><span>Nueva Cotizacion - Lote {selectedLote?.numero_lote}</span></div>}
        footer={[
          <Button key="cancel" onClick={closeModal}>Cancelar</Button>,
          <Button key="submit" type="primary" onClick={handleCotizar}>{cotizacionStep === 0 ? "Siguiente" : "Crear Cotizacion"}</Button>,
        ]}
      >
        <Steps current={cotizacionStep} items={[{ title: "Cliente" }, { title: "Precio" }]} style={{ marginBottom: 24 }} />
        {cotizacionStep === 0 ? (
          <>
            <Alert message="Seleccione el cliente para la cotizacion" type="info" showIcon style={{ marginBottom: 16 }} />
            <Select
              style={{ width: "100%" }}
              placeholder="Seleccionar cliente"
              loading={loadingClientes}
              showSearch
              optionFilterProp="label"
              value={selectedCliente}
              onChange={setSelectedCliente}
              notFoundContent="No hay clientes registrados"
              options={clientes?.map((c) => ({ value: c.id_cliente, label: `${c.nombres} - ${c.cedula_ruc}` })) ?? []}
            />
          </>
        ) : (
          <Form form={cotizacionForm} layout="vertical">
            <Alert message={`Lote ${selectedLote?.numero_lote} - Precio lista: $${selectedLote?.precio_lista?.toLocaleString()}`} type="success" showIcon style={{ marginBottom: 16 }} />
            <Form.Item name="precio_ofertado" label="Precio Ofertado" rules={[{ required: true, message: "Ingrese el precio" }]}>
              <InputNumber<number>
                style={{ width: "100%" }}
                min={0}
                step={100}
                prefix="$"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                parser={(value) => Number(value?.replace(/,/g, "") || 0)}
              />
            </Form.Item>
            <Form.Item name="observaciones" label="Observaciones">
              <Input.TextArea rows={3} placeholder="Notas adicionales..." />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Modal Reservar */}
      <Modal
        open={modalType === "reservar"}
        onCancel={closeModal}
        width={520}
        centered
        title={<div style={{ display: "flex", alignItems: "center", gap: 12 }}><ClockCircleOutlined style={{ fontSize: 20, color: "#faad14" }} /><span>Reservar Lote {selectedLote?.numero_lote}</span></div>}
        footer={[
          <Button key="cancel" onClick={closeModal} disabled={reservaSubmitting}>Cancelar</Button>,
          <Button key="submit" type="primary" loading={reservaSubmitting} onClick={handleReservar}>{reservaStep === 0 ? "Siguiente" : "Confirmar Reserva"}</Button>,
        ]}
      >
        <Steps current={reservaStep} items={[{ title: "Confirmar" }, { title: "Detalles" }]} style={{ marginBottom: 24 }} />
        {reservaStep === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fffbe6", border: "2px solid #faad14", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <ClockCircleOutlined style={{ fontSize: 36, color: "#faad14" }} />
            </div>
            <Title level={5}>Confirmar Reserva</Title>
            <Text type="secondary">Va a reservar el lote {selectedLote?.numero_lote} por ${selectedLote?.precio_lista?.toLocaleString()}</Text>
            <Alert message="El lote cambiara a estado RESERVADO" type="warning" showIcon style={{ marginTop: 16 }} />
          </div>
        ) : (
          <Form form={reservaForm} layout="vertical">
            <Form.Item name="cliente_nombre" label="Nombre del Cliente" rules={[{ required: true, message: "Ingrese el nombre" }]}>
              <Input prefix={<UserOutlined />} placeholder="Nombre completo" />
            </Form.Item>
            <Form.Item name="cliente_cedula" label="Cedula/RUC" rules={[{ required: true, message: "Ingrese la cedula" }]}>
              <Input placeholder="0912345678" />
            </Form.Item>
            <Form.Item name="cliente_email" label="Email" rules={[{ required: true, message: "Ingrese el email" }, { type: "email", message: "Email invalido" }]}>
              <Input prefix={<MailOutlined />} placeholder="cliente@email.com" />
            </Form.Item>
            <Form.Item name="cliente_telefono" label="Telefono">
              <Input prefix={<PhoneOutlined />} placeholder="0991234567" />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Modal Venta */}
      <Modal
        open={modalType === "venta"}
        onCancel={closeModal}
        width={560}
        centered
        title={<div style={{ display: "flex", alignItems: "center", gap: 12 }}><DollarOutlined style={{ fontSize: 20, color: "#52c41a" }} /><span>Crear Venta - Lote {selectedLote?.numero_lote}</span></div>}
        footer={[
          <Button key="cancel" onClick={closeModal} disabled={ventaSubmitting}>Cancelar</Button>,
          <Button key="submit" type="primary" loading={ventaSubmitting} onClick={handleVenta}>{ventaStep === 2 ? "Confirmar Venta" : "Siguiente"}</Button>,
        ]}
      >
        <Steps current={ventaStep} items={[{ title: "Cliente" }, { title: "Pago" }, { title: "Confirmar" }]} style={{ marginBottom: 24 }} />
        {ventaStep === 0 && (
          <Form form={ventaClienteForm} layout="vertical">
            <Form.Item name="cliente_nombre" label="Nombre del Cliente" rules={[{ required: true, message: "Ingrese el nombre" }]}>
              <Input prefix={<UserOutlined />} placeholder="Nombre completo" />
            </Form.Item>
            <Form.Item name="cliente_cedula" label="Cedula/RUC" rules={[{ required: true, message: "Ingrese la cedula" }]}>
              <Input placeholder="0912345678" />
            </Form.Item>
            <Form.Item name="cliente_email" label="Email" rules={[{ required: true, message: "Ingrese el email" }, { type: "email", message: "Email invalido" }]}>
              <Input prefix={<MailOutlined />} placeholder="cliente@email.com" />
            </Form.Item>
          </Form>
        )}
        {ventaStep === 1 && (
          <Form form={ventaForm} layout="vertical">
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Lote">{selectedLote?.numero_lote}</Descriptions.Item>
              <Descriptions.Item label="Precio">${selectedLote?.precio_lista?.toLocaleString()}</Descriptions.Item>
            </Descriptions>
            <Form.Item name="metodo_pago" label="Metodo de Pago" rules={[{ required: true, message: "Seleccione metodo" }]}>
              <Input placeholder="Transferencia / Efectivo / Tarjeta" />
            </Form.Item>
            <Form.Item name="anticipo" label="Anticipo" rules={[{ required: true, message: "Ingrese anticipo" }]}>
              <InputNumber style={{ width: "100%" }} min={0} prefix="$" />
            </Form.Item>
          </Form>
        )}
        {ventaStep === 2 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#f6ffed", border: "2px solid #52c41a", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <DollarOutlined style={{ fontSize: 36, color: "#52c41a" }} />
            </div>
            <Title level={5}>Confirmar Venta</Title>
            <Text type="secondary">Lote {selectedLote?.numero_lote} por ${selectedLote?.precio_lista?.toLocaleString()}</Text>
            <Alert message="Se generara contrato y plan de cuotas automaticamente" type="success" showIcon style={{ marginTop: 16 }} />
          </div>
        )}
      </Modal>

      {/* Modal Historial */}
      <Modal
        open={modalType === "historial"}
        onCancel={closeModal}
        width={520}
        centered
        footer={[<Button key="close" onClick={closeModal}>Cerrar</Button>]}
        title={<div style={{ display: "flex", alignItems: "center", gap: 12 }}><HistoryOutlined style={{ fontSize: 20, color: "#8c8c8c" }} /><span>Historial - Lote {selectedLote?.numero_lote}</span></div>}
      >
        <Timeline
          items={[
            {
              children: (
                <div>
                  <div style={{ fontWeight: 600 }}>Lote registrado</div>
                  <div style={{ fontSize: 12, color: "#8c8c8c" }}>Estado: {selectedLote?.estado}</div>
                </div>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
}
