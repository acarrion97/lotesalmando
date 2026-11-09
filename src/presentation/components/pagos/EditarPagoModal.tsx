import { useEffect, useState } from "react";
import { Alert, DatePicker, Form, InputNumber, Modal, Select, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useEmpresa } from "@/presentation/providers";
import { useOnlineStatus } from "@/presentation/hooks";
import { inventoryKeys } from "@/presentation/hooks/inventoryKeys";
import { getContainer } from "@/infrastructure/container";
import { formatCurrency } from "@/utils";
import type { FormaPago } from "@/domain/recibo/entities";

/** Fila de la tabla de pagos que alimenta el modal de corrección. */
export interface PagoAEditar {
  id_pago: number;
  id_cobranza: number;
  monto_pagado: number;
  fecha_pago: string;
  /** Viene de la BD como texto; se valida contra las formas del SRI al guardar. */
  forma_pago?: string;
}

const FORMAS_PAGO: { value: FormaPago; label: string }[] = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "deposito", label: "Depósito" },
  { value: "tarjeta", label: "Tarjeta" },
  { value: "cheque", label: "Cheque" },
  { value: "otro", label: "Otro" },
];

/**
 * Corrige una equivocación de carga: monto, fecha y forma de pago del pago
 * seleccionado. Va por la RPC `editar_pago` (migración 048), que además
 * recalcula el estado de la cuota.
 */
export function EditarPagoModal({
  open,
  pago,
  tieneRecibo,
  onClose,
}: {
  open: boolean;
  pago: PagoAEditar | null;
  /** El pago ya tiene recibo emitido: ese recibo no se regenera con el monto nuevo. */
  tieneRecibo: boolean;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  const [guardando, setGuardando] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { user } = useAuth();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (open && pago) {
      form.setFieldsValue({
        monto_pagado: pago.monto_pagado,
        fecha_pago: pago.fecha_pago ? dayjs(diaLocal(pago.fecha_pago)) : dayjs(),
        forma_pago: pago.forma_pago && pago.forma_pago !== "no_especificada"
          ? pago.forma_pago
          : undefined,
      });
    }
  }, [open, pago, form]);

  const handleGuardar = async () => {
    if (!pago) return;
    if (!user?.id_usuario) {
      messageApi.error("No se pudo identificar al usuario");
      return;
    }

    try {
      const values = await form.validateFields();
      setGuardando(true);
      const fecha = (values.fecha_pago as Dayjs).format("YYYY-MM-DD");
      await getContainer().actualizarPago.execute({
        id_pago: pago.id_pago,
        monto_pagado: values.monto_pagado,
        fecha_pago: fecha,
        forma_pago: values.forma_pago as FormaPago,
        id_usuario: user.id_usuario,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryKeys.pagos(empresaId) }),
        queryClient.invalidateQueries({ queryKey: ["cobranzas"] }),
        queryClient.invalidateQueries({ queryKey: ["contratos", empresaId] }),
        queryClient.invalidateQueries({ queryKey: ["carteraMetricas"] }),
      ]);
      messageApi.success("Pago actualizado correctamente");
      onClose();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "No se pudo actualizar el pago",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      title="Editar pago"
      open={open}
      onCancel={onClose}
      onOk={handleGuardar}
      okText="Guardar cambios"
      cancelText="Cancelar"
      confirmLoading={guardando}
      okButtonProps={{ disabled: !isOnline || !pago }}
      destroyOnHidden
      width={480}
    >
      {contextHolder}
      <div style={{ marginTop: 16 }}>
        {tieneRecibo && (
          <Alert
            type="warning"
            showIcon
            style={{ marginBottom: 16 }}
            message="Este pago ya tiene recibo emitido"
            description="El recibo conserva los datos con los que salió; corregir el pago no lo regenera. Si cambió el monto, reemítalo por el sistema tributario."
          />
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            name="monto_pagado"
            label="Monto pagado"
            rules={[
              { required: true, message: "Ingrese el monto pagado" },
              {
                validator: (_, value) =>
                  typeof value === "number" && value > 0
                    ? Promise.resolve()
                    : Promise.reject(new Error("El monto debe ser mayor a cero")),
              },
            ]}
          >
            <InputNumber
              min={0.01}
              step={0.01}
              style={{ width: "100%" }}
              placeholder="0.00"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            />
          </Form.Item>
          <Form.Item
            name="fecha_pago"
            label="Fecha del pago"
            rules={[{ required: true, message: "Seleccione la fecha del pago" }]}
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD/MM/YYYY"
              disabledDate={(d) => d.isAfter(dayjs(), "day")}
            />
          </Form.Item>
          <Form.Item
            name="forma_pago"
            label="Forma de pago"
            rules={[{ required: true, message: "Seleccione la forma de pago" }]}
          >
            <Select placeholder="Seleccione la forma de pago" options={FORMAS_PAGO} />
          </Form.Item>
        </Form>
        {pago && (
          <Alert
            type="info"
            showIcon
            message={`Pago #${pago.id_pago} · Cuota ${pago.id_cobranza} · ${formatCurrency(pago.monto_pagado)}`}
          />
        )}
      </div>
    </Modal>
  );
}

/**
 * `YYYY-MM-DD` tal como está guardado en la BD: se corta el string en vez de
 * pasar por `new Date()` para que la zona horaria no corra un día.
 */
function diaLocal(fecha: string): string {
  return fecha.slice(0, 10);
}
