import { useState } from "react";
import { Alert, Form, Input, Modal, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth, useEmpresa } from "@/presentation/providers";
import { useOnlineStatus } from "@/presentation/hooks";
import { inventoryKeys } from "@/presentation/hooks/inventoryKeys";
import { getContainer } from "@/infrastructure/container";

/** Fila de la tabla de pagos que alimenta el modal de eliminación. */
export interface PagoAEliminar {
  id_pago: number;
  id_cobranza: number;
  monto_pagado: number;
  fecha_pago: string;
}

/**
 * Elimina un pago repetido (la cuota con más de un pago). El motivo es
 * obligatorio y queda guardado en `pagos_eliminaciones` (migración 048) para
 * que siempre se pueda explicar por qué se borró.
 */
export function EliminarPagoModal({
  open,
  pago,
  onClose,
}: {
  open: boolean;
  pago: PagoAEliminar | null;
  onClose: () => void;
}) {
  const [form] = Form.useForm();
  const [eliminando, setEliminando] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const { user } = useAuth();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  const handleEliminar = async () => {
    if (!pago) return;
    if (!user?.id_usuario) {
      messageApi.error("No se pudo identificar al usuario");
      return;
    }

    try {
      const values = await form.validateFields();
      setEliminando(true);
      const resultado = await getContainer().eliminarPago.execute({
        id_pago: pago.id_pago,
        motivo: values.motivo,
        id_usuario: user.id_usuario,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: inventoryKeys.pagos(empresaId) }),
        queryClient.invalidateQueries({ queryKey: ["cobranzas"] }),
        queryClient.invalidateQueries({ queryKey: ["contratos", empresaId] }),
        queryClient.invalidateQueries({ queryKey: ["carteraMetricas"] }),
      ]);
      messageApi.success(
        resultado.recibo_eliminado
          ? "Pago eliminado (también se retiró su recibo)"
          : "Pago eliminado correctamente",
      );
      form.resetFields();
      onClose();
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "No se pudo eliminar el pago",
      );
    } finally {
      setEliminando(false);
    }
  };

  return (
    <Modal
      title="Eliminar pago"
      open={open}
      onCancel={onClose}
      onOk={handleEliminar}
      okText="Eliminar pago"
      cancelText="Cancelar"
      confirmLoading={eliminando}
      okButtonProps={{ danger: true, disabled: !isOnline || !pago }}
      destroyOnHidden
      width={480}
    >
      {contextHolder}
      <div style={{ marginTop: 16 }}>
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="Acción irreversible"
          description="Se borrará el pago y su recibo (si lo tiene), y la cuota volverá a quedar pendiente o vencida según lo que ya tenga cubierto. El motivo quedará guardado en el historial."
        />
        {pago && (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Pago #${pago.id_pago} · Cuota ${pago.id_cobranza}`}
            description={`Monto: $${pago.monto_pagado.toLocaleString()} · Fecha: ${pago.fecha_pago.slice(0, 10)}`}
          />
        )}
        <Form form={form} layout="vertical">
          <Form.Item
            name="motivo"
            label="Motivo de la eliminación"
            extra="Obligatorio. Se guarda en la base de datos para explicar el borrado."
            rules={[
              { required: true, message: "Indique el motivo de la eliminación" },
              {
                validator: (_, value) =>
                  typeof value === "string" && value.trim().length >= 5
                    ? Promise.resolve()
                    : Promise.reject(new Error("El motivo debe tener al menos 5 caracteres")),
              },
            ]}
          >
            <Input.TextArea
              rows={3}
              maxLength={500}
              showCount
              placeholder="Ej: Pago duplicado por error al confirmar dos veces"
            />
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );
}
