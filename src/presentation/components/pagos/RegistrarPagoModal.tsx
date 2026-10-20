import { useMemo, useState } from "react";
import {
  Alert,
  DatePicker,
  Descriptions,
  Form,
  InputNumber,
  Modal,
  Select,
  Tag,
  Typography,
  message,
} from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/presentation/providers";
import { useOnlineStatus } from "@/presentation/hooks";
import { getContainer } from "@/infrastructure/container";
import { pagoSchema } from "@/presentation/validations";
import { formatCurrency, formatDateOnly } from "@/utils";

const { Text } = Typography;

/**
 * Cuota a pagar con todo lo necesario para mostrar "de quien es": el cliente
 * viene resuelto por el llamador (cadena cobranza -> contrato -> venta ->
 * cliente) porque no existe relación directa cliente ↔ cobranza.
 */
export interface CobranzaAPagar {
  id_cobranza: number;
  numero_cuota: number;
  monto_cuota: number;
  estado?: string;
  fecha_vencimiento?: string | null;
  cliente?: string;
  cedula?: string;
  lote?: string;
  numero_contrato?: string;
}

interface FormValues {
  monto_pagado: number;
  fecha_pago: Dayjs;
}

const estadoCuota: Record<string, { color: string; label: string }> = {
  pendiente: { color: "processing", label: "Pendiente" },
  vencida: { color: "error", label: "Vencida" },
  pagada: { color: "success", label: "Pagada" },
};

interface RegistrarPagoModalProps {
  /** Cuota fija a pagar (flujo desde Clientes → Deudas). */
  cobranza?: CobranzaAPagar | null;
  /** Sin cuota fija, el usuario elige entre estas opciones (flujo desde Pagos). */
  opciones?: CobranzaAPagar[];
  open: boolean;
  onClose: () => void;
  /** Se ejecuta después de registrar, para refrescar la lista que abrió el modal. */
  onRegistrado?: () => void;
  title?: string;
}

/**
 * Modal único de registro de pago: monto + fecha, con el resumen de la cuota
 * (cliente, cédula, contrato, lote, vencimiento) a la vista para confirmar de
 * quien es el cobro antes de guardarlo. La cobranza elegida queda marcada como
 * pagada por RegisterPagoUseCase.
 */
export function RegistrarPagoModal({
  cobranza,
  opciones,
  open,
  onClose,
  onRegistrado,
  title = "Registrar Pago",
}: RegistrarPagoModalProps) {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<FormValues>();
  const [messageApi, contextHolder] = message.useMessage();
  const [guardando, setGuardando] = useState(false);
  const [idSeleccionado, setIdSeleccionado] = useState<number | null>(null);

  const esCuotaFija = cobranza != null;

  const cobranzaActual: CobranzaAPagar | null = useMemo(() => {
    if (cobranza) return cobranza;
    if (idSeleccionado === null) return null;
    return opciones?.find((o) => o.id_cobranza === idSeleccionado) ?? null;
  }, [cobranza, opciones, idSeleccionado]);

  /** Cierra y deja el formulario listo para la próxima cuota. */
  const cerrar = () => {
    setIdSeleccionado(null);
    form.resetFields();
    form.setFieldsValue({ monto_pagado: cobranza?.monto_cuota, fecha_pago: dayjs() });
    onClose();
  };

  const opcionesSelect = useMemo(
    () =>
      (opciones ?? []).map((c) => ({
        value: c.id_cobranza,
        label: `${c.cliente ?? `Cobranza #${c.id_cobranza}`} · Cuota ${c.numero_cuota} · ${formatCurrency(
          c.monto_cuota,
        )}${c.fecha_vencimiento ? ` (vence ${formatDateOnly(c.fecha_vencimiento.slice(0, 10))})` : ""}`,
      })),
    [opciones],
  );

  const handleRegistrar = async () => {
    if (!isOnline) {
      messageApi.error("Sin conexión: no se puede registrar un pago");
      return;
    }
    if (!user?.id_usuario) {
      messageApi.error("No se pudo identificar al usuario actual, vuelva a iniciar sesión");
      return;
    }
    if (!cobranzaActual) {
      messageApi.error("Seleccione la cuota a pagar");
      return;
    }

    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      return; // los errores ya se muestran en cada campo
    }

    try {
      setGuardando(true);
      const parsed = pagoSchema.parse({
        id_cobranza: cobranzaActual.id_cobranza,
        monto_pagado: values.monto_pagado,
      });
      await getContainer().registerPago.execute({
        id_cobranza: parsed.id_cobranza,
        id_usuario: user.id_usuario,
        monto_pagado: parsed.monto_pagado,
        fecha_pago: (values.fecha_pago ?? dayjs()).startOf("day").toDate().toISOString(),
      });
      await queryClient.invalidateQueries({ queryKey: ["pagos"] });
      await queryClient.invalidateQueries({ queryKey: ["cobranzas"] });
      await queryClient.invalidateQueries({ queryKey: ["carteraMetricas"] });
      messageApi.success("Pago registrado correctamente");
      onRegistrado?.();
      cerrar();
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "Error al registrar el pago");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      title={title}
      open={open}
      onCancel={cerrar}
      onOk={handleRegistrar}
      okText="Registrar pago"
      cancelText="Cancelar"
      confirmLoading={guardando}
      okButtonProps={{ disabled: !isOnline || !cobranzaActual }}
      destroyOnHidden
      width={560}
    >
      {contextHolder}
      <div style={{ marginTop: 16 }}>
        {!esCuotaFija && (
          <Form.Item label="Cuota a pagar" required style={{ marginBottom: 16 }}>
            <Select
              showSearch
              allowClear
              placeholder="Seleccione la cobranza a pagar"
              optionFilterProp="label"
              options={opcionesSelect}
              value={idSeleccionado}
              onChange={(id: number | undefined) => {
                setIdSeleccionado(id ?? null);
                const elegida = opciones?.find((o) => o.id_cobranza === id);
                form.setFieldValue("monto_pagado", elegida?.monto_cuota);
              }}
            />
          </Form.Item>
        )}

        {cobranzaActual ? (
          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Cliente" span={2}>
              {cobranzaActual.cliente ?? `Cobranza #${cobranzaActual.id_cobranza}`}
              {cobranzaActual.cedula ? ` · ${cobranzaActual.cedula}` : ""}
            </Descriptions.Item>
            {cobranzaActual.numero_contrato && (
              <Descriptions.Item label="Contrato">
                {cobranzaActual.numero_contrato}
              </Descriptions.Item>
            )}
            {cobranzaActual.lote && (
              <Descriptions.Item label="Lote">{cobranzaActual.lote}</Descriptions.Item>
            )}
            <Descriptions.Item label="Cuota">#{cobranzaActual.numero_cuota}</Descriptions.Item>
            {cobranzaActual.fecha_vencimiento && (
              <Descriptions.Item label="Vencimiento">
                {formatDateOnly(cobranzaActual.fecha_vencimiento.slice(0, 10))}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Monto de la cuota" span={2}>
              <Text strong>{formatCurrency(cobranzaActual.monto_cuota)}</Text>
            </Descriptions.Item>
            {cobranzaActual.estado && (
              <Descriptions.Item label="Estado" span={2}>
                <Tag color={estadoCuota[cobranzaActual.estado]?.color ?? "default"}>
                  {estadoCuota[cobranzaActual.estado]?.label ?? cobranzaActual.estado}
                </Tag>
              </Descriptions.Item>
            )}
          </Descriptions>
        ) : (
          !esCuotaFija && (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Seleccione la cuota para ver a quien pertenece el cobro"
            />
          )
        )}

        <Form
          form={form}
          layout="vertical"
          initialValues={{ monto_pagado: cobranza?.monto_cuota, fecha_pago: dayjs() }}
        >
          <Form.Item
            name="monto_pagado"
            label="Monto a pagar"
            rules={[
              { required: true, message: "Ingrese el monto" },
              {
                validator: (_, valor: number | null) =>
                  valor !== null && valor > 0
                    ? Promise.resolve()
                    : Promise.reject(new Error("El monto debe ser mayor a 0")),
              },
            ]}
            extra={
              cobranzaActual
                ? `Cuota de ${formatCurrency(cobranzaActual.monto_cuota)}; al registrarla la cuota queda como pagada.`
                : undefined
            }
          >
            <InputNumber style={{ width: "100%" }} min={0.01} step={100} prefix="$" />
          </Form.Item>
          <Form.Item
            name="fecha_pago"
            label="Fecha del pago"
            rules={[{ required: true, message: "Indique la fecha" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              disabledDate={(d) => d.isAfter(dayjs(), "day")}
            />
          </Form.Item>
        </Form>

        {!isOnline && (
          <Alert type="warning" showIcon message="Sin conexión: no se puede registrar un pago" />
        )}
      </div>
    </Modal>
  );
}
