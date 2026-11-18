import { useEffect, useState } from "react";
import { Alert, DatePicker, Descriptions, Form, InputNumber, Modal, Tag, Typography, message } from "antd";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import { useQueryClient } from "@tanstack/react-query";
import { useEmpresa } from "@/presentation/providers";
import { useOnlineStatus } from "@/presentation/hooks";
import { inventoryKeys } from "@/presentation/hooks/inventoryKeys";
import { getContainer } from "@/infrastructure/container";
import { formatCurrency, formatDateOnly } from "@/utils";

const { Text } = Typography;

/** Datos mínimos de la cuota que alimenta el modal de corrección. */
export interface CuotaAEditar {
  id_cobranza: number;
  numero_cuota: number;
  monto_cuota: number;
  fecha_vencimiento?: string | null;
  estado?: string;
  cliente?: string;
  cedula?: string;
  lote?: string;
  numero_contrato?: string;
  /** Total ya cobrado sobre esta cuota (para mostrar el efecto del cambio). */
  pagado?: number;
}

interface FormValues {
  monto_cuota: number;
  fecha_vencimiento: Dayjs;
}

const estadoCuota: Record<string, { color: string; label: string }> = {
  pendiente: { color: "processing", label: "Pendiente" },
  vencida: { color: "error", label: "Vencida" },
  pagada: { color: "success", label: "Pagada" },
};

/**
 * Corrige el monto y el vencimiento de una cuota ya generada. Se usa desde los
 * modales de Cobranzas, Pagos y de deudas del cliente para alinear la cartera
 * con los pagos realmente cobrados. El estado no se edita a mano: la RPC
 * `editar_cuota` (migración 057) lo recalcula con los pagos existentes.
 */
export function EditarCuotaModal({
  open,
  cuota,
  onClose,
}: {
  open: boolean;
  cuota: CuotaAEditar | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm<FormValues>();
  const [guardando, setGuardando] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (open && cuota) {
      form.setFieldsValue({
        monto_cuota: cuota.monto_cuota,
        fecha_vencimiento: cuota.fecha_vencimiento
          ? dayjs(diaLocal(cuota.fecha_vencimiento))
          : dayjs(),
      });
    }
  }, [open, cuota, form]);

  const handleGuardar = async () => {
    if (!cuota) return;

    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch {
      // Los errores se muestran en el propio formulario.
      return;
    }

    try {
      setGuardando(true);
      const fecha = (values.fecha_vencimiento as Dayjs).format("YYYY-MM-DD");
      const actualizada = await getContainer().editarCuota.execute({
        id_cobranza: cuota.id_cobranza,
        monto_cuota: values.monto_cuota,
        fecha_vencimiento: fecha,
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryKeys.cobranzas(empresaId) }),
        queryClient.invalidateQueries({ queryKey: inventoryKeys.pagos(empresaId) }),
        queryClient.invalidateQueries({ queryKey: inventoryKeys.ventas(empresaId) }),
        queryClient.invalidateQueries({ queryKey: ["contratos", empresaId] }),
        queryClient.invalidateQueries({ queryKey: ["carteraMetricas"] }),
      ]);

      messageApi.success(
        actualizada.estado === "pagada"
          ? "Cuota actualizada: los pagos registrados la cubren y quedó pagada"
          : `Cuota actualizada (${estadoCuota[actualizada.estado]?.label ?? actualizada.estado})`,
      );
      onClose();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "No se pudo actualizar la cuota",
      );
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal
      title={`Editar cuota${cuota ? ` #${cuota.numero_cuota}` : ""}`}
      open={open}
      onCancel={onClose}
      onOk={handleGuardar}
      okText="Guardar cambios"
      cancelText="Cancelar"
      confirmLoading={guardando}
      okButtonProps={{ disabled: !isOnline || !cuota }}
      destroyOnHidden
      width={520}
    >
      {contextHolder}
      <div style={{ marginTop: 16 }}>
        {cuota && (
          <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Cliente" span={2}>
              {cuota.cliente ?? `Cobranza #${cuota.id_cobranza}`}
              {cuota.cedula ? ` · ${cuota.cedula}` : ""}
            </Descriptions.Item>
            {cuota.numero_contrato && (
              <Descriptions.Item label="Contrato">{cuota.numero_contrato}</Descriptions.Item>
            )}
            {cuota.lote && <Descriptions.Item label="Lote">{cuota.lote}</Descriptions.Item>}
            <Descriptions.Item label="Cuota">#{cuota.numero_cuota}</Descriptions.Item>
            <Descriptions.Item label="Estado">
              <Tag color={estadoCuota[cuota.estado ?? ""]?.color ?? "default"}>
                {estadoCuota[cuota.estado ?? ""]?.label ?? cuota.estado ?? "-"}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Vencimiento actual" span={2}>
              {cuota.fecha_vencimiento
                ? formatDateOnly(cuota.fecha_vencimiento.slice(0, 10))
                : "-"}
            </Descriptions.Item>
            <Descriptions.Item label="Pagado registrado" span={2}>
              <Text strong>{formatCurrency(cuota.pagado ?? 0)}</Text>
              {cuota.pagado !== undefined && cuota.pagado > 0 && (
                <Text type="secondary">
                  {" "}
                  de {formatCurrency(cuota.monto_cuota)}
                </Text>
              )}
            </Descriptions.Item>
          </Descriptions>
        )}

        <Form form={form} layout="vertical">
          <Form.Item
            name="monto_cuota"
            label="Monto de la cuota"
            rules={[
              { required: true, message: "Ingrese el monto de la cuota" },
              {
                validator: (_, valor: number | null) =>
                  typeof valor === "number" && valor > 0
                    ? Promise.resolve()
                    : Promise.reject(new Error("El monto debe ser mayor a cero")),
              },
            ]}
            extra="Si el monto queda cubierto por los pagos registrados, la cuota pasa a «pagada»."
          >
            <InputNumber
              min={0.01}
              step={0.01}
              style={{ width: "100%" }}
              prefix="$"
              formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",")}
            />
          </Form.Item>
          <Form.Item
            name="fecha_vencimiento"
            label="Fecha de vencimiento"
            rules={[{ required: true, message: "Seleccione la fecha de vencimiento" }]}
            extra="Cambiar el vencimiento mueve la cuota entre «por vencer» y «en mora»."
          >
            <DatePicker style={{ width: "100%" }} format="DD/MM/YYYY" />
          </Form.Item>
        </Form>

        <Alert
          type="info"
          showIcon
          message="El estado se recalcula automáticamente"
          description="La cartera y el reporte de mora toman el monto realmente pagado; no es necesario editar los pagos."
        />
        {!isOnline && (
          <Alert
            type="warning"
            showIcon
            style={{ marginTop: 12 }}
            message="Sin conexión: no se puede editar la cuota"
          />
        )}
      </div>
    </Modal>
  );
}

/** `YYYY-MM-DD` tal como está guardado en la BD, sin corrimiento de zona horaria. */
function diaLocal(fecha: string): string {
  return fecha.slice(0, 10);
}
