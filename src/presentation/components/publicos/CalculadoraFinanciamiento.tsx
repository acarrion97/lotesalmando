import { useState } from "react";
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Steps,
  Tag,
  Typography,
} from "antd";
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  EnvironmentOutlined,
  InfoCircleOutlined,
  MailOutlined,
  PhoneOutlined,
  UserOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import type { PlanoLote } from "@/domain/mapa/entities";
import { etiquetaLote } from "@/presentation/components/maps/PlanoInteractivo";
import { ESTILO_ESTADO_PLANO } from "@/presentation/components/maps/estilosEstadoLote";
import {
  RANGOS_FINANCIAMIENTO,
  calcularFinanciamiento,
  formatCurrency,
  validarFinanciamiento,
} from "@/utils";

const { Text, Title } = Typography;

interface CalculadoraFinanciamientoProps {
  /** Todos los lotes del proyecto; el visitante elige con cuál simular. */
  lotes: PlanoLote[];
  moneda: string;
  /** Lote elegido (controlado por la página, para compartirlo con la ficha). */
  lote: PlanoLote | null;
  onLoteChange?: (lote: PlanoLote | null) => void;
  /** Cambia a la pestaña Mapa y abre la ficha de ese lote. */
  onVerEnMapa?: (lote: PlanoLote) => void;
  /**
   * Presente solo en el modal de financiamiento: muestra el formulario para
   * registrarse como prospecto por el lote elegido. Sin esta prop el bloque
   * no se dibuja (la pestaña Financiamiento no lo muestra).
   */
  onRegistrar?: (datos: RegistroInteresLote) => Promise<void>;
  /**
   * Modo "solo este lote": sin selector de lotes (la calculadora se queda con
   * el lote recibido). Se usa en el modal de financiamiento que abre la ficha.
   */
  soloLote?: boolean;
}

/** Lo que el visitante deja para que lo contacten por ese lote. */
export interface RegistroInteresLote {
  nombres: string;
  email: string;
  telefono: string;
  id_lote: number;
}

function dato(etiqueta: string, valor: string, destacado = false) {
  return (
    <div
      style={{
        flex: "1 1 170px",
        borderRadius: 10,
        border: destacado ? "2px solid #1677ff" : "1px solid #f0f0f0",
        background: destacado ? "#e6f4ff" : "#fff",
        padding: "12px 14px",
      }}
    >
      <div style={{ fontSize: 12, color: "#8c8c8c", marginBottom: 4 }}>{etiqueta}</div>
      <div
        style={{
          fontWeight: 700,
          fontSize: destacado ? 22 : 17,
          color: destacado ? "#1677ff" : "#1f1f1f",
        }}
      >
        {valor}
      </div>
    </div>
  );
}

/**
 * Calculadora de financiamiento de un lote: enganche, plazo y tasa sobre el
 * precio que trae el lote elegido (editable). El precio solo se conoce aquí
 * y en la ficha del lote, nunca en los tooltips del plano.
 */
export function CalculadoraFinanciamiento({
  lotes,
  moneda,
  lote,
  onLoteChange,
  onVerEnMapa,
  onRegistrar,
  soloLote = false,
}: CalculadoraFinanciamientoProps) {
  const [enganche, setEnganche] = useState<number | null>(30);
  const [plazo, setPlazo] = useState<number | null>(60);
  const [tasa, setTasa] = useState<number | null>(12);
  const [registroForm] = Form.useForm();
  const [registrando, setRegistrando] = useState(false);
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);
  /** Lote ya registrado por este visitante; el banner de éxito es por lote. */
  const [loteRegistrado, setLoteRegistrado] = useState<number | null>(null);
  /**
   * Wizard de dos pasos, solo cuando hay formulario de registro (el modal):
   * paso 1 la simulación, paso 2 los datos. La pestaña Financiamiento, sin
   * registro, sigue mostrando la simulación entera sin pasos.
   */
  const [pasoRegistro, setPasoRegistro] = useState(false);
  const enWizard = !!onRegistrar && lote != null;
  const pasoActivo = enWizard && pasoRegistro;

  /**
   * Precio escrito a mano, junto con el lote al que pertenece. Se guarda en
   * vez de "sincronizar con un efecto": si el visitante cambia de lote, la
   * edición vieja deja de aplicar y el precio vuelve al del lote nuevo (así
   * el campo siempre refleja el lote elegido, ya sea prellenado desde la
   * ficha del mapa o escrito a mano).
   */
  const [edicionPrecio, setEdicionPrecio] = useState<{
    loteId: number | null;
    valor: number;
  } | null>(null);

  const loteIdActual = lote?.id_lote ?? null;
  const precioManual = edicionPrecio !== null && edicionPrecio.loteId === loteIdActual;
  const precio =
    edicionPrecio && edicionPrecio.loteId === loteIdActual
      ? edicionPrecio.valor
      : (lote?.precio_lista ?? 0);

  const money = (valor: number) => {
    try {
      return formatCurrency(valor, moneda || "USD");
    } catch {
      return formatCurrency(valor, "USD");
    }
  };

  const entrada = {
    precio,
    enganchePorcentaje: enganche ?? 0,
    plazoMeses: plazo ?? 0,
    tasaAnualPorcentaje: tasa ?? 0,
  };
  const problema = validarFinanciamiento(entrada);
  const resultado = problema ? null : calcularFinanciamiento(entrada);

  const precioDeLista = lote?.precio_lista ?? null;
  const desalineado = !!lote && precioManual && precioDeLista != null && precio !== precioDeLista;

  const opcionesLotes = lotes.map((l) => {
    const estilo = ESTILO_ESTADO_PLANO[l.estado] ?? ESTILO_ESTADO_PLANO.disponible;
    return {
      value: l.id_lote,
      label: `${etiquetaLote(l)} · ${estilo.label}${l.precio_lista != null ? ` · ${money(l.precio_lista)}` : ""}`,
    };
  });

  const yaRegistrado = lote != null && loteRegistrado === lote.id_lote;

  const alRegistrar = async (datos: { nombres: string; email: string; telefono: string }) => {
    if (!onRegistrar || !lote) return;
    setRegistrando(true);
    setErrorRegistro(null);
    try {
      await onRegistrar({ ...datos, id_lote: lote.id_lote });
      setLoteRegistrado(lote.id_lote);
      registroForm.resetFields();
    } catch (error) {
      setErrorRegistro(error instanceof Error ? error.message : "No se pudo registrar tu interés");
    } finally {
      setRegistrando(false);
    }
  };

  return (
    <div style={{ maxWidth: 940, margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <Title level={4} style={{ marginBottom: 4 }}>
          <CalculatorOutlined style={{ marginRight: 8, color: "#1677ff" }} />
          Calculadora de financiamiento
        </Title>
        <Text type="secondary">
          {soloLote
            ? "Simulá las cuotas de este lote: ajustá el enganche, el plazo y la tasa."
            : "Simulá las cuotas de un lote: elegí uno de la lista o escribí un precio de referencia."}
        </Text>
      </div>

      {enWizard && (
        <Steps
          size="small"
          current={pasoRegistro ? 1 : 0}
          items={[{ title: "Simulación" }, { title: "Tus datos" }]}
          style={{ maxWidth: 340, margin: "0 auto 20px" }}
        />
      )}

      {!pasoActivo && (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                {soloLote ? (
                  "Lote"
                ) : (
                  <>
                    Lote a financiar <span style={{ color: "#ff4d4f" }}>*</span>
                  </>
                )}
              </label>
              {soloLote ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexWrap: "wrap",
                    minHeight: 32,
                  }}
                >
                  {lote ? (
                    <>
                      <Tag
                        color={
                          (ESTILO_ESTADO_PLANO[lote.estado] ?? ESTILO_ESTADO_PLANO.disponible).color
                        }
                        style={{ margin: 0 }}
                      >
                        {(ESTILO_ESTADO_PLANO[lote.estado] ?? ESTILO_ESTADO_PLANO.disponible).label}
                      </Tag>
                      <Text strong>{etiquetaLote(lote)}</Text>
                      {onVerEnMapa && (
                        <a onClick={() => onVerEnMapa(lote)}>
                          <EnvironmentOutlined /> Ver en el mapa
                        </a>
                      )}
                    </>
                  ) : (
                    <Text type="secondary">Sin lote seleccionado</Text>
                  )}
                </div>
              ) : (
                <>
                  <Select
                    style={{ width: "100%" }}
                    placeholder="Seleccionar un lote del proyecto"
                    showSearch
                    optionFilterProp="label"
                    allowClear
                    value={lote?.id_lote ?? null}
                    onChange={(valor) =>
                      onLoteChange?.(lotes.find((l) => l.id_lote === valor) ?? null)
                    }
                    options={opcionesLotes}
                    notFoundContent="No hay lotes cargados"
                  />
                  {lote && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                      <Tag
                        color={
                          (ESTILO_ESTADO_PLANO[lote.estado] ?? ESTILO_ESTADO_PLANO.disponible).color
                        }
                        style={{ margin: 0 }}
                      >
                        {(ESTILO_ESTADO_PLANO[lote.estado] ?? ESTILO_ESTADO_PLANO.disponible).label}
                      </Tag>
                      <Text type="secondary" style={{ fontSize: 13 }}>
                        {etiquetaLote(lote)}
                      </Text>
                      {onVerEnMapa && (
                        <a onClick={() => onVerEnMapa(lote)}>
                          <EnvironmentOutlined /> Ver en el mapa
                        </a>
                      )}
                    </div>
                  )}
                </>
              )}
            </Col>

            <Col xs={24} md={12}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                Precio del lote <span style={{ color: "#ff4d4f" }}>*</span>
              </label>
              <InputNumber<number>
                style={{ width: "100%" }}
                min={0}
                step={1000}
                value={precio}
                formatter={(value) =>
                  value == null ? "" : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => Number(value?.replace(/,/g, "") || 0)}
                onChange={(value) => setEdicionPrecio({ loteId: loteIdActual, valor: value ?? 0 })}
              />
              {!lote && (
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                  Todavía no elegiste un lote: escribí un precio de referencia.
                </Text>
              )}
              {desalineado && (
                <Text type="warning" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                  Este precio no coincide con el precio de lista ({money(precioDeLista ?? 0)}).
                </Text>
              )}
            </Col>

            <Col xs={24} sm={8}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                Enganche (%)
              </label>
              <InputNumber<number>
                style={{ width: "100%" }}
                min={RANGOS_FINANCIAMIENTO.engancheMin}
                max={RANGOS_FINANCIAMIENTO.engancheMax}
                value={enganche}
                formatter={(value) =>
                  value == null ? "" : `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
                }
                parser={(value) => Number(value?.replace(/,/g, "") || 0)}
                onChange={setEnganche}
              />
            </Col>
            <Col xs={24} sm={8}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                Plazo (meses)
              </label>
              <InputNumber<number>
                style={{ width: "100%" }}
                min={RANGOS_FINANCIAMIENTO.plazoMin}
                max={RANGOS_FINANCIAMIENTO.plazoMax}
                value={plazo}
                onChange={setPlazo}
              />
            </Col>
            <Col xs={24} sm={8}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>
                Tasa de interés anual (%)
              </label>
              <InputNumber<number>
                style={{ width: "100%" }}
                min={RANGOS_FINANCIAMIENTO.tasaMin}
                max={100}
                step={0.5}
                value={tasa}
                onChange={setTasa}
              />
            </Col>
          </Row>

          <div style={{ marginTop: 14 }}>
            {problema ? (
              <Alert
                type="warning"
                showIcon
                icon={<WarningOutlined />}
                message="Falta información para calcular"
                description={problema}
              />
            ) : resultado ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                {dato("Cuota mensual", money(resultado.cuotaMensual), true)}
                {dato("Enganche", money(resultado.enganche))}
                {dato("Monto financiado", money(resultado.montoFinanciado))}
                {dato("Intereses totales", money(resultado.interesesTotales))}
                {dato("Total a pagar", money(resultado.totalAPagar))}
              </div>
            ) : null}
          </div>

          {/* Aviso legal en una línea fina: el modal ya es largo de por sí. */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginTop: 14,
              color: "#8c8c8c",
              fontSize: 12.5,
              lineHeight: 1.55,
            }}
          >
            <InfoCircleOutlined style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              <Text strong style={{ fontSize: 12.5, color: "#595959" }}>
                Simulación referencial.
              </Text>{" "}
              Los valores son estimados con interés fijo y cuota fija; no constituyen una oferta ni
              una aprobación de crédito. Confirmá la cuota final con el asesor.
            </span>
          </div>

          {enWizard && (
            <Button
              type="primary"
              size="large"
              block
              icon={<ArrowRightOutlined />}
              style={{ marginTop: 18 }}
              onClick={() => setPasoRegistro(true)}
            >
              Quiero este lote
            </Button>
          )}
        </>
      )}

      {pasoActivo && (
        <div
          style={{
            marginTop: 4,
            padding: "16px 18px",
            borderRadius: 12,
            border: "1px solid #f0f0f0",
            background: "#fafafa",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
              marginBottom: 8,
            }}
          >
            <Tag
              color={(ESTILO_ESTADO_PLANO[lote.estado] ?? ESTILO_ESTADO_PLANO.disponible).color}
              style={{ margin: 0 }}
            >
              {(ESTILO_ESTADO_PLANO[lote.estado] ?? ESTILO_ESTADO_PLANO.disponible).label}
            </Tag>
            <Text strong>{etiquetaLote(lote)}</Text>
            {onVerEnMapa && (
              <a onClick={() => onVerEnMapa(lote)}>
                <EnvironmentOutlined /> Ver en el mapa
              </a>
            )}
          </div>

          <Title level={5} style={{ marginBottom: 4 }}>
            {yaRegistrado ? (
              <>
                <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
                ¡Listo, quedaste anotado!
              </>
            ) : (
              <>
                <UserOutlined style={{ color: "#1677ff", marginRight: 8 }} />
                ¿Te interesa este lote?
              </>
            )}
          </Title>

          {yaRegistrado ? (
            <>
              <Alert
                type="success"
                showIcon
                message={`Registramos tu interés en ${etiquetaLote(lote)}`}
                description="Un asesor te va a contactar con la información del lote. Esto no reserva ni compromete nada."
              />
              <Button style={{ marginTop: 14 }} onClick={() => setPasoRegistro(false)}>
                <ArrowLeftOutlined /> Volver a la simulación
              </Button>
            </>
          ) : (
            <>
              <Text type="secondary" style={{ display: "block", marginBottom: 14 }}>
                Dejanos tus datos y un asesor te contacta con la información de este lote. No se
                reserva ni se compromete nada.
              </Text>
              <Form form={registroForm} layout="vertical" onFinish={alRegistrar}>
                <Row gutter={12}>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="nombres"
                      label="Nombre y apellido"
                      rules={[
                        { required: true, message: "Ingresá tu nombre" },
                        { min: 2, message: "Ingresá tu nombre" },
                      ]}
                    >
                      <Input prefix={<UserOutlined />} placeholder="Juan Pérez" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="email"
                      label="Email"
                      rules={[
                        { required: true, message: "Ingresá tu email" },
                        { type: "email", message: "Email no válido" },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} placeholder="email@ejemplo.com" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Form.Item
                      name="telefono"
                      label="Teléfono"
                      rules={[
                        { required: true, message: "Ingresá tu teléfono" },
                        { min: 5, message: "Teléfono no válido" },
                      ]}
                    >
                      <Input prefix={<PhoneOutlined />} placeholder="0991234567" />
                    </Form.Item>
                  </Col>
                </Row>

                {errorRegistro && (
                  <Alert
                    type="error"
                    showIcon
                    style={{ marginBottom: 14 }}
                    message="No se pudo registrar tu interés"
                    description={errorRegistro}
                  />
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                  <Button
                    onClick={() => setPasoRegistro(false)}
                    disabled={registrando}
                    icon={<ArrowLeftOutlined />}
                  >
                    Volver
                  </Button>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={registrando}
                    style={{ flex: 1 }}
                  >
                    Quiero este lote
                  </Button>
                </div>
              </Form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
