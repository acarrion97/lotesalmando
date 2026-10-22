import { useEffect, useState } from "react";
import { Alert, Button, Col, Empty, Form, Input, Modal, Row, Select, Spin, message } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { getContainer } from "@/infrastructure/container";
import { useConfiguracionContrato, useProyectos } from "@/presentation/hooks";
import { inventoryKeys } from "@/presentation/hooks/inventoryKeys";
import { useEmpresa } from "@/presentation/providers";
import { configuracionContratoSchema } from "@/presentation/validations";

interface ConfiguracionContratoModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Datos legales del contrato de UN proyecto (botón "Configuración" de la
 * pantalla Contratos). Cada proyecto puede ser una razón social distinta,
 * por eso se guarda por proyecto y no en la configuración de la empresa.
 *
 * Los campos vacíos no rompen nada: el contrato toma el dato de la
 * configuración de la empresa (y el RUC de `empresa.ruc`).
 */
export function ConfiguracionContratoModal({ open, onClose }: ConfiguracionContratoModalProps) {
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

  const { data: config, isLoading: cargandoConfig } = useConfiguracionContrato(idProyectoActivo);

  // Carga lo guardado del proyecto elegido; al cambiar de proyecto el
  // formulario se vacía (la query de la clave nueva todavía no tiene datos).
  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      razon_social: config?.razon_social ?? empresaActual?.razon_social ?? undefined,
      ruc: config?.ruc ?? undefined,
      representante: config?.representante ?? undefined,
      representante_cedula: config?.representante_cedula ?? undefined,
      representante_email: config?.representante_email ?? undefined,
      ciudad: config?.ciudad ?? undefined,
      cuentas_bancarias: config?.cuentas_bancarias ?? undefined,
      direccion_canje: config?.direccion_canje ?? undefined,
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
      const parsed = configuracionContratoSchema.parse(values);
      setSaving(true);
      await container.saveConfiguracionContrato.execute({
        id_empresa: empresaActual.id_empresa,
        id_proyecto: idProyectoActivo,
        razon_social: parsed.razon_social?.trim() || empresaActual.razon_social,
        ruc: parsed.ruc?.trim() || null,
        representante: parsed.representante?.trim() || null,
        representante_cedula: parsed.representante_cedula?.trim() || null,
        representante_email: parsed.representante_email?.trim() || null,
        ciudad: parsed.ciudad?.trim() || null,
        cuentas_bancarias: parsed.cuentas_bancarias?.trim() || null,
        direccion_canje: parsed.direccion_canje?.trim() || null,
        direccion_matriz: parsed.direccion_matriz?.trim() || null,
        direccion_establecimiento: parsed.direccion_establecimiento?.trim() || null,
        codigo_establecimiento: parsed.codigo_establecimiento || "001",
        punto_emision: parsed.punto_emision || "001",
      });
      await queryClient.invalidateQueries({
        queryKey: inventoryKeys.configuracionContrato(empresaActual.id_empresa, idProyectoActivo),
      });
      messageApi.success("Configuración del proyecto guardada");
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
      title="Configuración del contrato por proyecto"
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
          extra="Cada proyecto guarda su propia configuración de contrato."
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
            description="Todavía no hay proyectos en esta empresa: creá uno para configurar su contrato."
            style={{ margin: "24px 0" }}
          />
        ) : (
          <>
            <Alert
              type="info"
              showIcon
              message="Datos fiscales requeridos para generar recibos de pago"
              description="Completa la razón social/RUC y las direcciones fiscales de matriz y establecimiento. Los códigos de establecimiento y punto de emisión inician en 001. La razón social y el RUC pueden heredarse de la empresa."
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
                  name="ruc"
                  label="RUC de la razón social"
                  extra="Se imprime en la cláusula PRIMERA, junto al nombre."
                >
                  <Input placeholder="RUC de la razón social de este proyecto" allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="direccion_matriz" label="Dirección de matriz">
                  <Input placeholder="Dirección fiscal de la matriz" allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="direccion_establecimiento" label="Dirección del establecimiento">
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
              <Col xs={24} sm={12}>
                <Form.Item
                  name="representante"
                  label="Representante de la empresa"
                  extra="Quien firma como propietario (gerente o apoderado)."
                >
                  <Input placeholder="Nombre y apellido de quien firma el contrato" allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="representante_cedula"
                  label="Cédula del representante"
                  extra="Sin puntos ni guiones."
                >
                  <Input placeholder="Cédula del representante sin puntos ni guiones" allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item name="representante_email" label="Correo del representante">
                  <Input placeholder="Correo del representante" allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="ciudad"
                  label="Ciudad donde se firma"
                  extra="Sale en la fecha de firma y en la cláusula de aceptación."
                >
                  <Input placeholder="Ciudad donde se firma el contrato" allowClear />
                </Form.Item>
              </Col>
              <Col xs={24} sm={24}>
                <Form.Item
                  name="cuentas_bancarias"
                  label="Cuentas para el pago"
                  extra="Se escribe en la cláusula de precio y forma de pago (una cuenta por línea)."
                >
                  <Input.TextArea
                    rows={3}
                    placeholder="Cuentas de cobro, una por línea"
                    showCount
                    maxLength={1000}
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={24}>
                <Form.Item
                  name="direccion_canje"
                  label="Dirección de canje de papeletas"
                  extra="Dónde se cambian las papeletas de depósito por los recibos."
                >
                  <Input placeholder="Dirección donde se canjean las papeletas" allowClear />
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
