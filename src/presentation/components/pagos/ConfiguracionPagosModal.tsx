import { useEffect, useState } from "react";
import { Alert, Button, Col, Empty, Form, Input, Modal, Row, Select, Spin, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useConfiguracionPagos, useProyectos } from "@/presentation/hooks";
import { inventoryKeys } from "@/presentation/hooks/inventoryKeys";
import { useEmpresa } from "@/presentation/providers";
import { configuracionPagosSchema } from "@/presentation/validations";

interface ConfiguracionPagosModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Datos fiscales de los recibos de UN proyecto (botón «Configuración de
 * recibos» de Cobranzas/Pagos). Cada proyecto puede emitir recibos bajo
 * una razón social distinta, por eso se guarda por proyecto.
 *
 * La razón social puede quedar vacía: el recibo la toma de la empresa.
 * Las direcciones fiscales sí son obligatorias para poder emitir.
 *
 * El RUC no se carga acá: es el del contrato del proyecto (o el de la
 * empresa), así que se pide una sola vez, en Contratos → Configuración.
 */
export function ConfiguracionPagosModal({ open, onClose }: ConfiguracionPagosModalProps) {
  const [form] = Form.useForm();
  const [proyectoId, setProyectoId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const container = getContainer();
  const { empresaActual } = useEmpresa();
  const { data: proyectos, isLoading: cargandoProyectos } = useProyectos();

  // El proyecto elegido se valida contra la lista cargada: si ya no existe
  // se cae al primero. Se deriva del estado, sin efectos en cascada.
  const idProyectoActivo =
    proyectoId !== null && proyectos?.some((p) => p.id_proyecto === proyectoId)
      ? proyectoId
      : (proyectos?.[0]?.id_proyecto ?? null);

  const { data: config, isLoading: cargandoConfig } = useConfiguracionPagos(idProyectoActivo);

  // Carga lo guardado del proyecto elegido; al cambiar de proyecto el
  // formulario se vacía (la query de la clave nueva todavía no tiene datos).
  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      razon_social: config?.razon_social ?? empresaActual?.razon_social ?? undefined,
      direccion_matriz: config?.direccion_matriz ?? undefined,
      direccion_establecimiento: config?.direccion_establecimiento ?? undefined,
      codigo_establecimiento: config?.codigo_establecimiento ?? "001",
      punto_emision: config?.punto_emision ?? "001",
    });
  }, [form, open, config, empresaActual?.razon_social]);

  const proyectosSeleccion = (proyectos ?? []).map((p) => ({
    value: p.id_proyecto,
    label: p.nombre,
  }));

  const handleGuardar = async () => {
    if (!empresaActual || idProyectoActivo === null) return;

    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return; // los errores ya se muestran inline en cada campo
    }

    try {
      const parsed = configuracionPagosSchema.parse(values);
      setSaving(true);
      await container.saveConfiguracionPagos.execute({
        id_empresa: empresaActual.id_empresa,
        id_proyecto: idProyectoActivo,
        razon_social: parsed.razon_social?.trim() || empresaActual.razon_social,
        direccion_matriz: parsed.direccion_matriz?.trim() || null,
        direccion_establecimiento: parsed.direccion_establecimiento?.trim() || null,
        codigo_establecimiento: parsed.codigo_establecimiento || "001",
        punto_emision: parsed.punto_emision || "001",
      });
      await queryClient.invalidateQueries({
        queryKey: inventoryKeys.configuracionPagos(empresaActual.id_empresa, idProyectoActivo),
      });
      messageApi.success("Configuración de recibos guardada");
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "No se pudo guardar la configuración",
      );
    } finally {
      setSaving(false);
    }
  };

  const sinProyectos = !cargandoProyectos && (proyectos?.length ?? 0) === 0;

  return (
    <Modal
      title="Configuración de recibos por proyecto"
      open={open}
      onCancel={onClose}
      width={760}
      destroyOnHidden
      footer={[
        <Button key="close" onClick={onClose}>
          Cancelar
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          loading={saving}
          disabled={idProyectoActivo === null || cargandoProyectos}
          onClick={handleGuardar}
        >
          Guardar
        </Button>,
      ]}
    >
      {contextHolder}

      <Form form={form} layout="vertical">
        <Form.Item
          label="Proyecto"
          required
          extra="Cada proyecto guarda su propia configuración de recibos."
        >
          <Select
            placeholder="Seleccione un proyecto"
            options={proyectosSeleccion}
            value={idProyectoActivo}
            onChange={setProyectoId}
            loading={cargandoProyectos}
            showSearch
            optionFilterProp="label"
            notFoundContent={sinProyectos ? "Sin proyectos" : undefined}
          />
        </Form.Item>

        {sinProyectos ? (
          <Empty
            description="Todavía no hay proyectos en esta empresa: creá uno para configurar sus recibos."
            style={{ margin: "24px 0" }}
          />
        ) : (
          <>
            <Alert
              type="info"
              showIcon
              message="Datos fiscales que van impresos en los recibos"
              description="Completá la razón social emisora y las direcciones fiscales de matriz y establecimiento. Los códigos de establecimiento y punto de emisión inician en 001. La razón social vacía se hereda de la empresa y el RUC se toma del contrato del proyecto (Contratos → Configuración), así que no hay que cargarlo acá."
              style={{ marginBottom: 16 }}
            />

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="razon_social"
                  label="Razón social del emisor"
                  rules={[{ required: true, message: "Ingresa la razón social" }]}
                >
                  <Input placeholder="Razón social del emisor" allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="direccion_matriz"
                  label="Dirección de matriz"
                  rules={[{ required: true, message: "Ingresa la dirección de matriz" }]}
                >
                  <Input placeholder="Dirección fiscal de la matriz" allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="direccion_establecimiento"
                  label="Dirección del establecimiento"
                  rules={[{ required: true, message: "Ingresa la dirección del establecimiento" }]}
                >
                  <Input placeholder="Dirección fiscal del establecimiento" allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="codigo_establecimiento"
                  label="Código de establecimiento"
                  rules={[{ required: true, message: "Ingresa el código de establecimiento" }]}
                >
                  <Input maxLength={3} placeholder="001" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="punto_emision"
                  label="Punto de emisión"
                  rules={[{ required: true, message: "Ingresa el punto de emisión" }]}
                >
                  <Input maxLength={3} placeholder="001" />
                </Form.Item>
              </Col>
            </Row>

            {cargandoConfig && idProyectoActivo !== null && (
              <div style={{ textAlign: "center", padding: 8 }}>
                <Spin size="small" />
              </div>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
}
