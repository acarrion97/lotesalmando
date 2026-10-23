import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Spin,
  Tag,
  message,
} from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useConfiguracion } from "@/presentation/hooks";
import { useEmpresa } from "@/presentation/providers";
import { getContainer } from "@/infrastructure/container";
import { inventoryKeys } from "@/presentation/hooks/inventoryKeys";
import { configuracionSchema } from "@/presentation/validations";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { MapaProyectoCard } from "./MapaProyectoCard";
import { GaleriaProyectoCard } from "./GaleriaProyectoCard";
import { LogoEmpresaPage } from "./LogoEmpresaPage";
import { ExportacionWizard } from "./exportacion";

const MONEDAS = [
  { value: "USD", label: "USD · Dólar estadounidense" },
  { value: "EUR", label: "EUR · Euro" },
  { value: "MXN", label: "MXN · Peso mexicano" },
  { value: "COP", label: "COP · Peso colombiano" },
  { value: "PEN", label: "PEN · Sol peruano" },
  { value: "CLP", label: "CLP · Peso chileno" },
  { value: "ARS", label: "ARS · Peso argentino" },
  { value: "BRL", label: "BRL · Real brasileño" },
  { value: "UYU", label: "UYU · Peso uruguayo" },
  { value: "PYG", label: "PYG · Guaraní paraguayo" },
  { value: "BOB", label: "BOB · Boliviano" },
  { value: "GTQ", label: "GTQ · Quetzal guatemalteco" },
  { value: "NIO", label: "NIO · Córdoba nicaragüense" },
  { value: "HNL", label: "HNL · Lempira hondureña" },
  { value: "PAB", label: "PAB · Balboa panameño" },
  { value: "DOP", label: "DOP · Peso dominicano" },
  { value: "CRC", label: "CRC · Colón costarricense" },
];

const IDIOMAS = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
];

export function ConfiguracionPage() {
  const { empresaActual } = useEmpresa();
  const { data: configuracion, isLoading, isError, refetch } = useConfiguracion();
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const container = getContainer();

  const empresaId = empresaActual?.id_empresa;
  const configId = configuracion?.id_configuracion ?? null;
  const monedaGuardada = configuracion?.moneda ?? null;
  const idiomaGuardado = configuracion?.idioma ?? null;
  const diasAvisoGuardados = configuracion?.dias_aviso_cuota ?? 5;
  // El RUC no vive en `configuracion`: es un dato de la empresa.
  const rucGuardado = empresaActual?.ruc ?? null;

  // Hidrata el formulario con lo guardado (o lo limpia si esta empresa aún no tiene config).
  useEffect(() => {
    if (!empresaId) return;
    if (configId !== null) {
      form.setFieldsValue({
        moneda: monedaGuardada ?? undefined,
        idioma: idiomaGuardado ?? undefined,
        dias_aviso_cuota: diasAvisoGuardados,
        ruc: rucGuardado ?? undefined,
      });
    } else {
      form.resetFields();
      form.setFieldsValue({ ruc: rucGuardado ?? undefined, dias_aviso_cuota: 5 });
    }
  }, [form, empresaId, configId, monedaGuardada, idiomaGuardado, diasAvisoGuardados, rucGuardado]);
  const moneda = Form.useWatch("moneda", form);
  const idioma = Form.useWatch("idioma", form);

  const vistaPrevia = useMemo(() => {
    if (!moneda || !idioma) return null;
    try {
      return new Intl.NumberFormat(idioma, { style: "currency", currency: moneda }).format(
        1234567.89,
      );
    } catch {
      return "Vista previa no disponible para esta combinación";
    }
  }, [moneda, idioma]);

  const monedaLabel = MONEDAS.find((m) => m.value === moneda)?.label ?? moneda;
  const idiomaLabel = IDIOMAS.find((i) => i.value === idioma)?.label ?? idioma;

  const handleSave = async () => {
    if (!empresaActual) return;

    let values: Record<string, unknown>;
    try {
      values = await form.validateFields();
    } catch {
      return; // los errores ya se muestran inline en cada campo
    }

    try {
      const parsed = configuracionSchema.parse(values);
      setSaving(true);
      await container.saveConfiguracion.execute({
        id_empresa: empresaActual.id_empresa,
        moneda: parsed.moneda,
        idioma: parsed.idioma,
        dias_aviso_cuota: parsed.dias_aviso_cuota,
      });
      await queryClient.invalidateQueries({
        queryKey: inventoryKeys.configuracion(empresaActual.id_empresa),
      });
      // El RUC es de la empresa: se edita acá y se imprime en el contrato.
      const rucNuevo = parsed.ruc?.trim() ?? "";
      if (rucNuevo !== (empresaActual.ruc ?? "")) {
        await container.updateEmpresa.execute(empresaActual.id_empresa, { ruc: rucNuevo });
        await queryClient.invalidateQueries({ queryKey: ["empresas"] });
      }
      messageApi.success(
        configuracion
          ? "Configuración actualizada correctamente"
          : "Configuración creada correctamente",
      );
    } catch (error) {
      messageApi.error(
        error instanceof Error ? error.message : "No se pudo guardar la configuración",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!empresaActual) {
    return (
      <div>
        {contextHolder}
        <PageToolbar title="Configuracion" />
        <Alert
          type="info"
          showIcon
          message="No hay una empresa seleccionada"
          description="Seleccioná una empresa (menú superior) para ver y editar su configuración."
        />
      </div>
    );
  }

  return (
    <div>
      {contextHolder}
      <PageToolbar
        title="Configuracion"
        subtitle={`${empresaActual.razon_social}${empresaActual.ruc ? ` · RUC ${empresaActual.ruc}` : ""}`}
        actions={
          <Button
            type="primary"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSave}
            disabled={isLoading || isError}
          >
            Guardar cambios
          </Button>
        }
      />

      {isLoading ? (
        <Card style={{ textAlign: "center", padding: 40 }}>
          <Spin />
          <div style={{ marginTop: 12, color: "#8c8c8c" }}>Cargando configuración...</div>
        </Card>
      ) : isError ? (
        <Alert
          type="error"
          showIcon
          message="No se pudo cargar la configuración"
          description="Revisá la conexión e intentá de nuevo."
          action={
            <Button size="small" onClick={() => refetch()}>
              Reintentar
            </Button>
          }
        />
      ) : (
        <>
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Card title="Preferencias de la empresa" style={{ borderRadius: 12 }}>
                <Form form={form} layout="vertical">
                  <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="moneda"
                        label="Moneda"
                        rules={[{ required: true, message: "Seleccione la moneda" }]}
                        extra="Moneda con la que opera la empresa."
                      >
                        <Select
                          options={MONEDAS}
                          placeholder="Seleccione una moneda"
                          showSearch
                          optionFilterProp="label"
                          allowClear
                        />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="idioma"
                        label="Idioma"
                        rules={[{ required: true, message: "Seleccione el idioma" }]}
                        extra="Idioma preferido de la empresa."
                      >
                        <Select options={IDIOMAS} placeholder="Seleccione un idioma" allowClear />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="ruc"
                        label="RUC de la empresa"
                        extra="Se imprime en el contrato, junto al nombre. Si un proyecto tiene su propio RUC, se usa ese."
                      >
                        <Input placeholder="RUC de la empresa" maxLength={20} allowClear />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="dias_aviso_cuota"
                        label="Avisar cuotas antes del vencimiento"
                        rules={[{ required: true, message: "Indique los días de anticipación" }]}
                        extra="El correo se enviará una sola vez por cuota, dentro de este período."
                      >
                        <InputNumber
                          min={1}
                          max={30}
                          precision={0}
                          addonAfter="días antes"
                          style={{ width: "100%" }}
                        />
                      </Form.Item>
                    </Col>
                  </Row>

                  {vistaPrevia && (
                    <Alert
                      type="info"
                      showIcon
                      message="Vista previa de formato"
                      description={
                        <span>
                          Ejemplo con <strong>{monedaLabel}</strong> en{" "}
                          <strong>{idiomaLabel}</strong>: <strong>{vistaPrevia}</strong>
                        </span>
                      }
                      style={{ marginBottom: 16 }}
                    />
                  )}
                </Form>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card title="Estado" style={{ borderRadius: 12 }}>
                <Descriptions column={1} size="small" bordered>
                  <Descriptions.Item label="Empresa">
                    {empresaActual.razon_social}
                  </Descriptions.Item>
                  <Descriptions.Item label="RUC">{empresaActual.ruc || "—"}</Descriptions.Item>
                  <Descriptions.Item label="Estado">
                    {empresaActual.estado || "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Moneda">
                    {configuracion?.moneda ?? "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Idioma">
                    {IDIOMAS.find((i) => i.value === configuracion?.idioma)?.label ??
                      configuracion?.idioma ??
                      "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Aviso de cuotas">
                    {diasAvisoGuardados} días antes
                  </Descriptions.Item>
                </Descriptions>

                <div style={{ marginTop: 16 }}>
                  {configuracion ? (
                    <Tag color="green">Configuración existente (se actualizará)</Tag>
                  ) : (
                    <Tag color="orange">Aún sin configuración: se creará al guardar</Tag>
                  )}
                </div>
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <LogoEmpresaPage />
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card
                title="Importación y exportación de datos"
                style={{ borderRadius: 12 }}
                extra={
                  <span style={{ color: "#8c8c8c", fontSize: 12 }}>
                    Plantillas XLSX/CSV con las cabeceras de tus tablas, y carga de archivos a la
                    base de datos
                  </span>
                }
              >
                <ExportacionWizard />
              </Card>
            </Col>
          </Row>

          <MapaProyectoCard />

          <GaleriaProyectoCard />
        </>
      )}
    </div>
  );
}
