import { useState, useMemo } from "react";
import { Typography, Tag, Button, Modal, Descriptions, Select, Row, Col, Card, Statistic, Form, InputNumber, Input, Steps, message, Timeline, Alert } from "antd";
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
import { useEmpresa } from "@/presentation/providers";

const { Title, Text } = Typography;

interface LoteMapa {
  id: number;
  numero: string;
  estado: "disponible" | "reservado" | "vendido";
  precio: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ManzanaMapa {
  id: number;
  nombre: string;
  lotes: LoteMapa[];
}

interface ProyectoMapa {
  id: number;
  nombre: string;
  imagen: string;
  manzanas: ManzanaMapa[];
}

const proyectosData: Record<number, ProyectoMapa[]> = {
  1: [
    {
      id: 1,
      nombre: "Villa del Lago",
      imagen: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=1200&q=80",
      manzanas: [
        {
          id: 1,
          nombre: "Manzana A",
          lotes: [
            { id: 1, numero: "A-01", estado: "disponible", precio: 35000, x: 8, y: 15, width: 16, height: 20 },
            { id: 2, numero: "A-02", estado: "reservado", precio: 42000, x: 28, y: 15, width: 16, height: 20 },
            { id: 3, numero: "A-03", estado: "vendido", precio: 35000, x: 48, y: 15, width: 16, height: 20 },
            { id: 4, numero: "A-04", estado: "disponible", precio: 52000, x: 68, y: 15, width: 16, height: 20 },
            { id: 5, numero: "A-05", estado: "vendido", precio: 35000, x: 8, y: 42, width: 16, height: 20 },
            { id: 6, numero: "A-06", estado: "disponible", precio: 38000, x: 28, y: 42, width: 16, height: 20 },
            { id: 7, numero: "A-07", estado: "reservado", precio: 40000, x: 48, y: 42, width: 16, height: 20 },
            { id: 8, numero: "A-08", estado: "disponible", precio: 45000, x: 68, y: 42, width: 16, height: 20 },
          ],
        },
        {
          id: 2,
          nombre: "Manzana B",
          lotes: [
            { id: 9, numero: "B-01", estado: "vendido", precio: 40000, x: 8, y: 70, width: 16, height: 20 },
            { id: 10, numero: "B-02", estado: "disponible", precio: 38000, x: 28, y: 70, width: 16, height: 20 },
            { id: 11, numero: "B-03", estado: "disponible", precio: 42000, x: 48, y: 70, width: 16, height: 20 },
            { id: 12, numero: "B-04", estado: "reservado", precio: 50000, x: 68, y: 70, width: 16, height: 20 },
          ],
        },
      ],
    },
  ],
  2: [
    {
      id: 3,
      nombre: "Ciudad Norte",
      imagen: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=1200&q=80",
      manzanas: [
        {
          id: 4,
          nombre: "Manzana D",
          lotes: [
            { id: 19, numero: "D-01", estado: "disponible", precio: 32000, x: 12, y: 18, width: 18, height: 22 },
            { id: 20, numero: "D-02", estado: "vendido", precio: 35000, x: 35, y: 18, width: 18, height: 22 },
            { id: 21, numero: "D-03", estado: "disponible", precio: 30000, x: 58, y: 18, width: 18, height: 22 },
            { id: 22, numero: "D-04", estado: "reservado", precio: 38000, x: 12, y: 50, width: 18, height: 22 },
            { id: 23, numero: "D-05", estado: "disponible", precio: 33000, x: 35, y: 50, width: 18, height: 22 },
            { id: 24, numero: "D-06", estado: "vendido", precio: 36000, x: 58, y: 50, width: 18, height: 22 },
          ],
        },
      ],
    },
  ],
};

const clientesMock = [
  { id: 1, nombre: "Juan Perez", cedula: "0912345678", email: "juan@email.com", telefono: "0991234567" },
  { id: 2, nombre: "Maria Garcia", cedula: "0923456789", email: "maria@email.com", telefono: "0982345678" },
  { id: 3, nombre: "Carlos Lopez", cedula: "0934567890", email: "carlos@email.com", telefono: "0973456789" },
  { id: 4, nombre: "Ana Rodriguez", cedula: "0945678901", email: "ana@email.com", telefono: "0964567890" },
];

const historialMock = [
  { fecha: "2024-01-15 10:30", accion: "Lote creado", usuario: "Admin", descripcion: "Lote registrado en el sistema" },
  { fecha: "2024-01-20 14:15", accion: "Cotizacion enviada", usuario: "Andres Cevallos", descripcion: "Cotizacion #$52,000 enviada a Juan Perez" },
  { fecha: "2024-01-22 09:00", accion: "Reserva confirmada", usuario: "Andres Cevallos", descripcion: "Lote reservado por Juan Perez" },
];

const estadoConfig = {
  disponible: { color: "#52c41a", bg: "rgba(82, 196, 26, 0.3)", border: "#52c41a", label: "Disponible", icon: <CheckCircleOutlined /> },
  reservado: { color: "#faad14", bg: "rgba(250, 173, 20, 0.3)", border: "#faad14", label: "Reservado", icon: <ClockCircleOutlined /> },
  vendido: { color: "#a0522d", bg: "rgba(160, 82, 45, 0.35)", border: "#a0522d", label: "Vendido", icon: <StopOutlined /> },
};

type ModalType = "detail" | "cotizar" | "reservar" | "venta" | "historial" | null;

export function MapasPage() {
  const { empresaActual } = useEmpresa();
  const [selectedProyecto, setSelectedProyecto] = useState<number | null>(null);
  const [selectedManzana, setSelectedManzana] = useState<number | null>(null);
  const [selectedLote, setSelectedLote] = useState<LoteMapa | null>(null);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [cotizacionStep, setCotizacionStep] = useState(0);
  const [reservaStep, setReservaStep] = useState(0);
  const [ventaStep, setVentaStep] = useState(0);
  const [selectedCliente, setSelectedCliente] = useState<number | null>(null);
  const [cotizacionForm] = Form.useForm();
  const [reservaForm] = Form.useForm();
  const [ventaForm] = Form.useForm();

  const allProyectos = useMemo(() => {
    return Object.values(proyectosData).flat();
  }, []);

  const proyectos = useMemo(() => {
    if (!empresaActual) return allProyectos;
    return proyectosData[empresaActual.id_empresa] || [];
  }, [empresaActual, allProyectos]);

  const currentProyecto = useMemo(() => {
    return proyectos.find((p) => p.id === selectedProyecto) || proyectos[0] || null;
  }, [proyectos, selectedProyecto]);

  const manzanas = currentProyecto?.manzanas || [];

  const currentManzana = useMemo(() => {
    return manzanas.find((m) => m.id === selectedManzana) || manzanas[0] || null;
  }, [manzanas, selectedManzana]);

  const lotes = currentManzana?.lotes || [];

  const stats = useMemo(() => ({
    total: lotes.length,
    disponibles: lotes.filter((l) => l.estado === "disponible").length,
    reservados: lotes.filter((l) => l.estado === "reservado").length,
    vendidos: lotes.filter((l) => l.estado === "vendido").length,
  }), [lotes]);

  const openModal = (type: ModalType) => {
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
      ventaForm.resetFields();
    }
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedLote(null);
  };

  const handleLoteClick = (lote: LoteMapa) => {
    setSelectedLote(lote);
    openModal("detail");
  };

  const navigateLote = (direction: "prev" | "next") => {
    if (!selectedLote || !currentManzana) return;
    const currentIndex = currentManzana.lotes.findIndex((l) => l.id === selectedLote.id);
    const newIndex = direction === "next"
      ? (currentIndex + 1) % currentManzana.lotes.length
      : (currentIndex - 1 + currentManzana.lotes.length) % currentManzana.lotes.length;
    setSelectedLote(currentManzana.lotes[newIndex]);
  };

  const handleCotizar = () => {
    if (cotizacionStep === 0) {
      if (!selectedCliente) {
        message.warning("Seleccione un cliente");
        return;
      }
      setCotizacionStep(1);
    } else {
      cotizacionForm.validateFields().then((values) => {
        message.success(`Cotizacion #$${values.precio_ofertado.toLocaleString()} creada para Lote ${selectedLote?.numero}`);
        closeModal();
      });
    }
  };

  const handleReservar = () => {
    if (reservaStep === 0) {
      setReservaStep(1);
    } else {
      reservaForm.validateFields().then(() => {
        message.success(`Lote ${selectedLote?.numero} reservado correctamente`);
        closeModal();
      });
    }
  };

  const handleVenta = () => {
    if (ventaStep === 0) {
      if (!selectedCliente) {
        message.warning("Seleccione un cliente");
        return;
      }
      setVentaStep(1);
    } else if (ventaStep === 1) {
      setVentaStep(2);
    } else {
      message.success(`Venta de Lote ${selectedLote?.numero} registrada correctamente`);
      closeModal();
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          <EnvironmentOutlined style={{ marginRight: 8 }} />
          Mapa de Lotes
        </Title>
        <Text type="secondary">
          {empresaActual?.razon_social} - Seleccione un lote para ver detalles
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Select
            placeholder="Seleccionar Proyecto"
            style={{ width: "100%" }}
            size="large"
            value={currentProyecto?.id}
            onChange={(value) => {
              setSelectedProyecto(value);
              setSelectedManzana(null);
            }}
            options={proyectos.map((p) => ({ value: p.id, label: p.nombre }))}
          />
        </Col>
        <Col xs={24} sm={8}>
          <Select
            placeholder="Seleccionar Manzana"
            style={{ width: "100%" }}
            size="large"
            value={currentManzana?.id}
            onChange={setSelectedManzana}
            options={manzanas.map((m) => ({ value: m.id, label: m.nombre }))}
          />
        </Col>
        <Col xs={24} sm={8}>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            {Object.entries(estadoConfig).map(([key, config]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", background: "#fff", borderRadius: 6, border: "1px solid #f0f0f0" }}>
                <div style={{ width: 14, height: 14, borderRadius: 4, background: config.bg, border: `2px solid ${config.border}` }} />
                <span style={{ fontSize: 12 }}>{config.label}</span>
              </div>
            ))}
          </div>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ borderRadius: 10 }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Total</span>} value={stats.total} valueStyle={{ fontWeight: 700, fontSize: 22 }} prefix={<HomeOutlined style={{ color: "#1677ff" }} />} />
          </Card>
        </Col>
        <Col xs={8} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #b7eb8f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Disponibles</span>} value={stats.disponibles} valueStyle={{ fontWeight: 700, fontSize: 18, color: "#52c41a" }} />
          </Card>
        </Col>
        <Col xs={8} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #ffe58f" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Reservados</span>} value={stats.reservados} valueStyle={{ fontWeight: 700, fontSize: 18, color: "#faad14" }} />
          </Card>
        </Col>
        <Col xs={8} sm={6}>
          <Card size="small" style={{ borderRadius: 10, border: "1px solid #d9b8a8" }}>
            <Statistic title={<span style={{ fontSize: 12 }}>Vendidos</span>} value={stats.vendidos} valueStyle={{ fontWeight: 700, fontSize: 18, color: "#a0522d" }} />
          </Card>
        </Col>
      </Row>

      <Card style={{ borderRadius: 12, overflow: "hidden" }} styles={{ body: { padding: 0 } }}>
        <div style={{ padding: "12px 20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fafafa" }}>
          <div>
            <Text strong style={{ fontSize: 15 }}>{currentProyecto?.nombre}</Text>
            <Text type="secondary" style={{ marginLeft: 12, fontSize: 13 }}>{currentManzana?.nombre} - {lotes.length} lotes</Text>
          </div>
          <BookOutlined style={{ color: "#8c8c8c" }} />
        </div>

        <div style={{ position: "relative", width: "100%", paddingBottom: "60%", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, backgroundImage: `url(${currentProyecto?.imagen})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.85) saturate(0.9)" }} />
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.25)" }} />

          {lotes.map((lote) => {
            const config = estadoConfig[lote.estado];
            return (
              <button
                key={lote.id}
                onClick={() => handleLoteClick(lote)}
                style={{
                  position: "absolute",
                  left: `${lote.x}%`,
                  top: `${lote.y}%`,
                  width: `${lote.width}%`,
                  height: `${lote.height}%`,
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
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "scale(1.05)";
                  e.currentTarget.style.zIndex = "10";
                  e.currentTarget.style.boxShadow = `0 6px 20px ${config.color}60`;
                  e.currentTarget.style.background = config.bg.replace("0.3", "0.5");
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "scale(1)";
                  e.currentTarget.style.zIndex = "1";
                  e.currentTarget.style.boxShadow = "none";
                  e.currentTarget.style.background = config.bg;
                }}
              >
                <HomeOutlined style={{ color: "#fff", fontSize: 14, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }} />
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 11, lineHeight: 1, textShadow: "0 1px 3px rgba(0,0,0,0.5)" }}>{lote.numero}</span>
                <span style={{ color: "#fff", fontSize: 9, opacity: 0.9, textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>${lote.precio.toLocaleString()}</span>
              </button>
            );
          })}
        </div>
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
            <div style={{ width: 48, height: 48, borderRadius: 12, background: estadoConfig[selectedLote.estado].bg, border: `2px solid ${estadoConfig[selectedLote.estado].border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <HomeOutlined style={{ color: estadoConfig[selectedLote.estado].color, fontSize: 22 }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>Lote {selectedLote.numero}</div>
              <Tag color={estadoConfig[selectedLote.estado].color} icon={estadoConfig[selectedLote.estado].icon}>{estadoConfig[selectedLote.estado].label}</Tag>
            </div>
          </div>
        )}
      >
        {selectedLote && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 20 }}>
              <Descriptions.Item label="Numero">{selectedLote.numero}</Descriptions.Item>
              <Descriptions.Item label="Manzana">{currentManzana?.nombre}</Descriptions.Item>
              <Descriptions.Item label="Proyecto" span={2}>{currentProyecto?.nombre}</Descriptions.Item>
              <Descriptions.Item label="Precio Lista" span={2}>
                <span style={{ fontWeight: 700, fontSize: 18, color: "#1677ff" }}>${selectedLote.precio.toLocaleString()}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Estado" span={2}>
                <Tag color={estadoConfig[selectedLote.estado].color} icon={estadoConfig[selectedLote.estado].icon}>{estadoConfig[selectedLote.estado].label}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigateLote("prev")} style={{ flex: 1 }}>Anterior</Button>
              <Button icon={<ArrowRightOutlined />} onClick={() => navigateLote("next")} style={{ flex: 1 }}>Siguiente</Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {selectedLote.estado === "disponible" && (
                <>
                  <Button type="primary" block size="large" icon={<FileTextOutlined />} onClick={() => openModal("cotizar")}>Cotizar Lote</Button>
                  <Button block size="large" icon={<ClockCircleOutlined />} style={{ borderColor: "#faad14", color: "#faad14" }} onClick={() => openModal("reservar")}>Reservar Lote</Button>
                </>
              )}
              {selectedLote.estado === "reservado" && (
                <Button type="primary" block size="large" icon={<DollarOutlined />} onClick={() => openModal("venta")}>Crear Venta</Button>
              )}
              <Button block icon={<HistoryOutlined />} onClick={() => openModal("historial")}>Ver historial de movimientos</Button>
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
        title={<div style={{ display: "flex", alignItems: "center", gap: 12 }}><FileTextOutlined style={{ fontSize: 20, color: "#1677ff" }} /><span>Nueva Cotizacion - Lote {selectedLote?.numero}</span></div>}
        footer={[
          <Button key="cancel" onClick={closeModal}>Cancelar</Button>,
          <Button key="submit" type="primary" onClick={handleCotizar}>{cotizacionStep === 0 ? "Siguiente" : "Crear Cotizacion"}</Button>,
        ]}
      >
        <Steps current={cotizacionStep} items={[{ title: "Cliente" }, { title: "Precio" }]} style={{ marginBottom: 24 }} />
        {cotizacionStep === 0 ? (
          <div>
            <Alert message="Seleccione el cliente para la cotizacion" type="info" showIcon style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {clientesMock.map((cliente) => (
                <Card
                  key={cliente.id}
                  size="small"
                  hoverable
                  style={{ cursor: "pointer", border: selectedCliente === cliente.id ? "2px solid #1677ff" : "1px solid #f0f0f0" }}
                  onClick={() => setSelectedCliente(cliente.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}><UserOutlined /> {cliente.nombre}</div>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>{cliente.cedula} - {cliente.email}</div>
                    </div>
                    {selectedCliente === cliente.id && <CheckCircleOutlined style={{ color: "#1677ff", fontSize: 18 }} />}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <Form form={cotizacionForm} layout="vertical">
            <Alert message={`Lote ${selectedLote?.numero} - Precio lista: $${selectedLote?.precio.toLocaleString()}`} type="success" showIcon style={{ marginBottom: 16 }} />
            <Form.Item name="precio_ofertado" label="Precio Ofertado" rules={[{ required: true, message: "Ingrese el precio" }]}>
              <InputNumber style={{ width: "100%" }} min={0} step={100} prefix="$" formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")} parser={(value) => Number(value?.replace(/,/g, "") || 0) as any} />
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
        title={<div style={{ display: "flex", alignItems: "center", gap: 12 }}><ClockCircleOutlined style={{ fontSize: 20, color: "#faad14" }} /><span>Reservar Lote {selectedLote?.numero}</span></div>}
        footer={[
          <Button key="cancel" onClick={closeModal}>Cancelar</Button>,
          <Button key="submit" type="primary" onClick={handleReservar}>{reservaStep === 0 ? "Siguiente" : "Confirmar Reserva"}</Button>,
        ]}
      >
        <Steps current={reservaStep} items={[{ title: "Confirmar" }, { title: "Detalles" }]} style={{ marginBottom: 24 }} />
        {reservaStep === 0 ? (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: "#fffbe6", border: "2px solid #faad14", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <ClockCircleOutlined style={{ fontSize: 36, color: "#faad14" }} />
            </div>
            <Title level={5}>Confirmar Reserva</Title>
            <Text type="secondary">Va a reservar el lote {selectedLote?.numero} por ${selectedLote?.precio.toLocaleString()}</Text>
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
        title={<div style={{ display: "flex", alignItems: "center", gap: 12 }}><DollarOutlined style={{ fontSize: 20, color: "#52c41a" }} /><span>Crear Venta - Lote {selectedLote?.numero}</span></div>}
        footer={[
          <Button key="cancel" onClick={closeModal}>Cancelar</Button>,
          <Button key="submit" type="primary" onClick={handleVenta}>{ventaStep === 2 ? "Confirmar Venta" : "Siguiente"}</Button>,
        ]}
      >
        <Steps current={ventaStep} items={[{ title: "Cliente" }, { title: "Pago" }, { title: "Confirmar" }]} style={{ marginBottom: 24 }} />
        {ventaStep === 0 && (
          <div>
            <Alert message="Seleccione el cliente para la venta" type="info" showIcon style={{ marginBottom: 16 }} />
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {clientesMock.map((cliente) => (
                <Card key={cliente.id} size="small" hoverable style={{ cursor: "pointer", border: selectedCliente === cliente.id ? "2px solid #1677ff" : "1px solid #f0f0f0" }} onClick={() => setSelectedCliente(cliente.id)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}><UserOutlined /> {cliente.nombre}</div>
                      <div style={{ fontSize: 12, color: "#8c8c8c" }}>{cliente.cedula} - {cliente.email}</div>
                    </div>
                    {selectedCliente === cliente.id && <CheckCircleOutlined style={{ color: "#1677ff", fontSize: 18 }} />}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
        {ventaStep === 1 && (
          <Form form={ventaForm} layout="vertical">
            <Alert message={`Venta Lote ${selectedLote?.numero}`} type="success" showIcon style={{ marginBottom: 16 }} />
            <Descriptions bordered column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Lote">{selectedLote?.numero}</Descriptions.Item>
              <Descriptions.Item label="Precio">${selectedLote?.precio.toLocaleString()}</Descriptions.Item>
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
            <Text type="secondary">Lote {selectedLote?.numero} por ${selectedLote?.precio.toLocaleString()}</Text>
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
        title={<div style={{ display: "flex", alignItems: "center", gap: 12 }}><HistoryOutlined style={{ fontSize: 20, color: "#8c8c8c" }} /><span>Historial - Lote {selectedLote?.numero}</span></div>}
      >
        <Timeline
          items={historialMock.map((item) => ({
            children: (
              <div>
                <div style={{ fontWeight: 600 }}>{item.accion}</div>
                <div style={{ fontSize: 12, color: "#8c8c8c" }}>{item.fecha} - {item.usuario}</div>
                <div style={{ marginTop: 4 }}>{item.descripcion}</div>
              </div>
            ),
          }))}
        />
      </Modal>
    </div>
  );
}
