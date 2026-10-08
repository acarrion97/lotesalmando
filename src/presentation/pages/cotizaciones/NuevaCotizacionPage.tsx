import { useState, useMemo } from "react";
import {
  Row,
  Col,
  Card,
  Form,
  Select,
  InputNumber,
  Button,
  Typography,
  Divider,
  Descriptions,
  Steps,
  message,
  Alert,
} from "antd";
import { ShoppingCartOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  useTodosClientes,
  useProyectos,
  useEtapasByProyecto,
  useManzanasByEtapa,
  useLotesByManzana,
  useAsesores,
  useAsesorDeSesion,
} from "@/presentation/hooks";
import { TablaPlanCuotas } from "@/presentation/components/cotizaciones/TablaPlanCuotas";
import { getContainer } from "@/infrastructure/container";
import { formatCurrency } from "@/utils";

const { Title, Text } = Typography;

export function NuevaCotizacionPage() {
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);

  const [selectedCliente, setSelectedCliente] = useState<number | null>(null);
  const [selectedProyecto, setSelectedProyecto] = useState<number | null>(null);
  const [selectedEtapa, setSelectedEtapa] = useState<number | null>(null);
  const [selectedManzana, setSelectedManzana] = useState<number | null>(null);
  const [selectedLote, setSelectedLote] = useState<number | null>(null);
  const [precioOfertado, setPrecioOfertado] = useState<number>(0);
  // Condiciones de financiamiento (spec cotizaciones/plan-de-pago)
  const [montoEntrada, setMontoEntrada] = useState<number>(0);
  const [numCuotas, setNumCuotas] = useState<number>(12);

  const { data: clientes, isLoading: loadingClientes } = useTodosClientes();
  const { data: asesores, isLoading: loadingAsesores } = useAsesores();
  // Spec plan-de-pago: la cotización que crea un asesor con sesión activa guarda
  // ese asesor por defecto. `undefined` = sin tocar (se usa el de la sesión),
  // `null` = vaciado a mano por el usuario.
  const { asesor: asesorDeSesion } = useAsesorDeSesion();
  const [idAsesorInput, setIdAsesorInput] = useState<number | null | undefined>(undefined);
  const idAsesor =
    idAsesorInput === undefined ? (asesorDeSesion?.id_asesor ?? null) : idAsesorInput;
  const { data: proyectos, isLoading: loadingProyectos } = useProyectos();
  const { data: etapas, isLoading: loadingEtapas } = useEtapasByProyecto(selectedProyecto ?? 0);
  const { data: manzanas, isLoading: loadingManzanas } = useManzanasByEtapa(selectedEtapa ?? 0);
  const { data: lotes, isLoading: loadingLotes } = useLotesByManzana(selectedManzana ?? 0);

  const selectedLoteData = useMemo(() => {
    if (!lotes || !selectedLote) return null;
    return lotes.find((l) => l.id_lote === selectedLote) ?? null;
  }, [lotes, selectedLote]);

  const selectedClienteData = useMemo(() => {
    if (!clientes || !selectedCliente) return null;
    return clientes.find((c) => c.id_cliente === selectedCliente) ?? null;
  }, [clientes, selectedCliente]);

  const selectedProyectoData = useMemo(() => {
    if (!proyectos || !selectedProyecto) return null;
    return proyectos.find((p) => p.id_proyecto === selectedProyecto) ?? null;
  }, [proyectos, selectedProyecto]);

  const handleClienteChange = (value: number) => {
    setSelectedCliente(value);
    setSelectedProyecto(null);
    setSelectedEtapa(null);
    setSelectedManzana(null);
    setSelectedLote(null);
    form.setFieldsValue({
      proyecto: undefined,
      etapa: undefined,
      manzana: undefined,
      lote: undefined,
    });
  };

  const handleProyectoChange = (value: number) => {
    setSelectedProyecto(value);
    setSelectedEtapa(null);
    setSelectedManzana(null);
    setSelectedLote(null);
    form.setFieldsValue({ etapa: undefined, manzana: undefined, lote: undefined });
  };

  const handleEtapaChange = (value: number) => {
    setSelectedEtapa(value);
    setSelectedManzana(null);
    setSelectedLote(null);
    form.setFieldsValue({ manzana: undefined, lote: undefined });
  };

  const handleManzanaChange = (value: number) => {
    setSelectedManzana(value);
    setSelectedLote(null);
    form.setFieldsValue({ lote: undefined });
  };

  const handleLoteChange = (value: number) => {
    setSelectedLote(value);
    const lote = lotes?.find((l) => l.id_lote === value);
    if (lote) {
      setPrecioOfertado(lote.precio_lista);
    }
  };

  const condicionesValidas =
    precioOfertado > 0 &&
    montoEntrada >= 0 &&
    montoEntrada < precioOfertado &&
    Number.isInteger(numCuotas) &&
    numCuotas >= 1;

  const nombreAsesor =
    idAsesor == null
      ? null
      : (asesores?.find((a) => a.id_asesor === idAsesor)?.nombre_comercial ?? null);

  const handleSubmit = async () => {
    if (!selectedLote || !selectedCliente) {
      message.error("Complete todos los campos requeridos");
      return;
    }
    if (!condicionesValidas) {
      message.error(
        "Revise la entrada y el número de cuotas: la entrada debe ser menor al precio ofertado",
      );
      return;
    }

    try {
      await getContainer().createCotizacion.execute({
        id_cliente: selectedCliente,
        id_lote: selectedLote,
        precio_ofertado: precioOfertado,
        estado: "borrador",
        id_asesor: idAsesor,
        monto_entrada: montoEntrada,
        num_cuotas: numCuotas,
      });
      await queryClient.invalidateQueries({ queryKey: ["cotizaciones"] });
      await queryClient.invalidateQueries({ queryKey: ["clientes"] });
      message.success("Cotizacion creada exitosamente");
      form.resetFields();
      setSelectedCliente(null);
      setSelectedProyecto(null);
      setSelectedEtapa(null);
      setSelectedManzana(null);
      setSelectedLote(null);
      setPrecioOfertado(0);
      setIdAsesorInput(undefined);
      setMontoEntrada(0);
      setNumCuotas(12);
      setCurrentStep(0);
      navigate("/cotizaciones");
    } catch (error) {
      message.error(error instanceof Error ? error.message : "No se pudo crear la cotizacion");
    }
  };

  const steps = [
    { title: "Seleccion", description: "Cliente y Lote" },
    { title: "Precio", description: "Oferta" },
    { title: "Confirmar", description: "Resumen" },
  ];

  return (
    <div>
      <Title level={4} style={{ marginBottom: 16 }}>
        <ShoppingCartOutlined style={{ marginRight: 8 }} />
        Nueva Cotizacion
      </Title>

      <Steps current={currentStep} items={steps} style={{ marginBottom: 24 }} responsive />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title="Datos de la Cotizacion">
            <Form form={form} layout="vertical" onFinish={handleSubmit}>
              <Form.Item
                label="Cliente"
                name="cliente"
                rules={[{ required: true, message: "Seleccione un cliente" }]}
              >
                <Select
                  placeholder="Seleccionar cliente"
                  loading={loadingClientes}
                  showSearch
                  optionFilterProp="label"
                  onChange={handleClienteChange}
                  options={
                    clientes?.map((c) => ({
                      value: c.id_cliente,
                      label: `${c.nombres} - ${c.cedula_ruc}`,
                    })) ?? []
                  }
                />
              </Form.Item>

              <Form.Item
                label="Proyecto"
                name="proyecto"
                rules={[{ required: true, message: "Seleccione un proyecto" }]}
              >
                <Select
                  placeholder="Seleccionar proyecto"
                  loading={loadingProyectos}
                  showSearch
                  optionFilterProp="label"
                  onChange={handleProyectoChange}
                  options={
                    proyectos?.map((p) => ({
                      value: p.id_proyecto,
                      label: p.nombre,
                    })) ?? []
                  }
                />
              </Form.Item>

              <Form.Item
                label="Etapa"
                name="etapa"
                rules={[{ required: true, message: "Seleccione una etapa" }]}
              >
                <Select
                  placeholder="Seleccionar etapa"
                  loading={loadingEtapas}
                  disabled={!selectedProyecto}
                  showSearch
                  optionFilterProp="label"
                  onChange={handleEtapaChange}
                  options={
                    etapas?.map((e) => ({
                      value: e.id_etapa,
                      label: e.nombre,
                    })) ?? []
                  }
                />
              </Form.Item>

              <Form.Item
                label="Manzana"
                name="manzana"
                rules={[{ required: true, message: "Seleccione una manzana" }]}
              >
                <Select
                  placeholder="Seleccionar manzana"
                  loading={loadingManzanas}
                  disabled={!selectedEtapa}
                  showSearch
                  optionFilterProp="label"
                  onChange={handleManzanaChange}
                  options={
                    manzanas?.map((m) => ({
                      value: m.id_manzana,
                      label: m.nombre_codigo,
                    })) ?? []
                  }
                />
              </Form.Item>

              <Form.Item
                label="Lote"
                name="lote"
                rules={[{ required: true, message: "Seleccione un lote" }]}
              >
                <Select
                  placeholder="Seleccionar lote"
                  loading={loadingLotes}
                  disabled={!selectedManzana}
                  showSearch
                  optionFilterProp="label"
                  onChange={handleLoteChange}
                  options={
                    lotes?.map((l) => ({
                      value: l.id_lote,
                      label: `Lote ${l.numero_lote} - ${formatCurrency(l.precio_lista)}`,
                    })) ?? []
                  }
                />
              </Form.Item>

              <Divider />

              <Form.Item
                label="Precio Ofertado"
                name="precio_ofertado"
                rules={[{ required: true, message: "Ingrese el precio ofertado" }]}
              >
                <InputNumber
                  style={{ width: "100%" }}
                  min={0}
                  step={100}
                  formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                  parser={(value) =>
                    Number(value?.replace(/\$\s?|(,*)/g, "") ?? 0) as unknown as number
                  }
                  value={precioOfertado}
                  onChange={(value) => setPrecioOfertado(value ?? 0)}
                />
              </Form.Item>

              <Form.Item
                label="Asesor"
                extra="Puede quedar sin asesor si la cotización no la registra uno."
              >
                <Select
                  placeholder="Seleccionar asesor"
                  allowClear
                  loading={loadingAsesores}
                  showSearch
                  optionFilterProp="label"
                  value={idAsesor ?? undefined}
                  onChange={(value) => setIdAsesorInput(value ?? null)}
                  options={[
                    { value: 0, label: "Sin asesor" },
                    ...(asesores ?? [])
                      .filter((a) => a.estado === "activo")
                      .map((a) => ({ value: a.id_asesor, label: a.nombre_comercial })),
                  ]}
                />
              </Form.Item>

              <Row gutter={12}>
                <Col span={12}>
                  <Form.Item
                    label="Entrada"
                    extra={
                      precioOfertado > 0
                        ? `Máximo ${formatCurrency(Math.max(0, precioOfertado - 1))}`
                        : undefined
                    }
                  >
                    <InputNumber
                      style={{ width: "100%" }}
                      min={0}
                      max={Math.max(0, precioOfertado - 1)}
                      step={100}
                      formatter={(value) => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
                      parser={(value) =>
                        Number(value?.replace(/\$\s?|(,*)/g, "") ?? 0) as unknown as number
                      }
                      value={montoEntrada}
                      onChange={(value) => setMontoEntrada(value ?? 0)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Número de cuotas">
                    <InputNumber
                      style={{ width: "100%" }}
                      min={1}
                      max={360}
                      value={numCuotas}
                      onChange={(value) => setNumCuotas(value ?? 1)}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {!condicionesValidas && precioOfertado > 0 && (
                <Alert
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="La entrada debe ser menor al precio ofertado y las cuotas al menos 1"
                />
              )}

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  block
                  size="large"
                  disabled={!selectedLote || !selectedCliente || !condicionesValidas}
                >
                  Crear Cotizacion
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Resumen de la Cotizacion" style={{ position: "sticky", top: 80 }}>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Cliente">
                {selectedClienteData ? (
                  `${selectedClienteData.nombres}`
                ) : (
                  <Text type="secondary">Sin seleccionar</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Cedula/RUC">
                {selectedClienteData?.cedula_ruc ?? <Text type="secondary">-</Text>}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Proyecto">
                {selectedProyectoData?.nombre ?? <Text type="secondary">Sin seleccionar</Text>}
              </Descriptions.Item>
              <Descriptions.Item label="Etapa">
                {etapas?.find((e) => e.id_etapa === selectedEtapa)?.nombre ?? (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Manzana">
                {manzanas?.find((m) => m.id_manzana === selectedManzana)?.nombre_codigo ?? (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Lote">
                {selectedLoteData ? (
                  `Lote ${selectedLoteData.numero_lote}`
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Estado Lote">
                {selectedLoteData?.estado?.toUpperCase() ?? <Text type="secondary">-</Text>}
              </Descriptions.Item>
            </Descriptions>

            <Divider />

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="Precio Lista">
                {selectedLoteData ? (
                  formatCurrency(selectedLoteData.precio_lista)
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Precio Ofertado">
                {precioOfertado > 0 ? (
                  formatCurrency(precioOfertado)
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Asesor">
                {idAsesor == null ? (
                  <Text type="secondary">Sin asesor</Text>
                ) : (
                  (nombreAsesor ?? <Text type="secondary">-</Text>)
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Entrada">{formatCurrency(montoEntrada)}</Descriptions.Item>
              <Descriptions.Item label="Número de cuotas">{numCuotas}</Descriptions.Item>
              <Descriptions.Item label="Diferencia">
                {selectedLoteData && precioOfertado > 0 ? (
                  <Text
                    type={precioOfertado < selectedLoteData.precio_lista ? "danger" : "success"}
                  >
                    {formatCurrency(precioOfertado - selectedLoteData.precio_lista)}
                  </Text>
                ) : (
                  <Text type="secondary">-</Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            <Divider />
            <Text strong>Plan de cuotas</Text>
            <div style={{ marginTop: 8 }}>
              <TablaPlanCuotas
                precio_ofertado={precioOfertado}
                monto_entrada={montoEntrada}
                num_cuotas={numCuotas}
                scrollY={260}
              />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
