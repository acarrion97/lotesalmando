import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Form,
  Image,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Upload,
  message,
} from "antd";
import { DeleteOutlined, PictureOutlined, SaveOutlined, UploadOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { useConfiguracion, useProyectos, useMapaByProyecto } from "@/presentation/hooks";
import { useEmpresa } from "@/presentation/providers";
import { getContainer } from "@/infrastructure/container";
import { inventoryKeys } from "@/presentation/hooks/inventoryKeys";
import { configuracionSchema } from "@/presentation/validations";
import { PageToolbar } from "@/presentation/components/common/PageToolbar";
import { EnlacePublicoMapa } from "./EnlacePublicoMapa";

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

const FORMATOS_ADMITIDOS = ["image/png", "image/jpeg", "image/webp"];
const TAMANO_MAXIMO_IMAGEN = 10 * 1024 * 1024; // 10 MB, igual que el bucket

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
  const idiomaGuardada = configuracion?.idioma ?? null;

  // Hidrata el formulario con lo guardado (o lo limpia si esta empresa aún no tiene config).
  useEffect(() => {
    if (!empresaId) return;
    if (configId !== null) {
      form.setFieldsValue({
        moneda: monedaGuardada ?? undefined,
        idioma: idiomaGuardada ?? undefined,
      });
    } else {
      form.resetFields();
    }
  }, [form, empresaId, configId, monedaGuardada, idiomaGuardada]);

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

  // --- Mapa del proyecto: imagen del plano (subida a Supabase Storage) ---
  const { data: proyectosDelMapa } = useProyectos();
  const [proyectoMapa, setProyectoMapa] = useState<number | null>(null);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const [subiendoPlano, setSubiendoPlano] = useState(false);
  const [quitandoPlano, setQuitandoPlano] = useState(false);
  const { data: mapaProyecto, isLoading: cargandoMapa } = useMapaByProyecto(proyectoMapa ?? 0);

  // Libera el object URL de la previsualización al cambiarlo o al desmontar.
  useEffect(() => {
    return () => {
      if (archivoSeleccionado) URL.revokeObjectURL(archivoSeleccionado.preview);
    };
  }, [archivoSeleccionado]);

  const proyectosMapaOptions = useMemo(
    () => (proyectosDelMapa ?? []).map((p) => ({ value: p.id_proyecto, label: p.nombre })),
    [proyectosDelMapa],
  );

  const seleccionarPlano = (file: File) => {
    if (!FORMATOS_ADMITIDOS.includes(file.type)) {
      messageApi.error("Formato no admitido: usá PNG, JPG o WEBP");
      return Upload.LIST_IGNORE;
    }
    if (file.size > TAMANO_MAXIMO_IMAGEN) {
      messageApi.error("La imagen supera los 10 MB");
      return Upload.LIST_IGNORE;
    }
    setArchivoSeleccionado({ file, preview: URL.createObjectURL(file) });
    return Upload.LIST_IGNORE;
  };

  const handleSubirPlano = async () => {
    if (!empresaActual || !proyectoMapa || !archivoSeleccionado) return;
    try {
      setSubiendoPlano(true);
      await container.subirImagenMapa.execute(proyectoMapa, archivoSeleccionado.file);
      await queryClient.invalidateQueries({ queryKey: ["mapa", empresaActual.id_empresa] });
      setArchivoSeleccionado(null);
      messageApi.success("Plano del proyecto actualizado");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo subir la imagen");
    } finally {
      setSubiendoPlano(false);
    }
  };

  const handleQuitarPlano = async () => {
    if (!empresaActual || !proyectoMapa) return;
    try {
      setQuitandoPlano(true);
      await container.quitarImagenMapa.execute(proyectoMapa);
      await queryClient.invalidateQueries({ queryKey: ["mapa", empresaActual.id_empresa] });
      setArchivoSeleccionado(null);
      messageApi.success("Plano eliminado");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo eliminar la imagen");
    } finally {
      setQuitandoPlano(false);
    }
  };

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
      });
      await queryClient.invalidateQueries({
        queryKey: inventoryKeys.configuracion(empresaActual.id_empresa),
      });
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
              <Card
                title="Mapa del proyecto"
                style={{ borderRadius: 12 }}
                extra={
                  <span style={{ color: "#8c8c8c", fontSize: 12 }}>
                    Plano sobre el que se dibujan los lotes (pantalla Mapas y mapa público)
                  </span>
                }
              >
                <Row gutter={[16, 16]}>
                  <Col xs={24} md={9}>
                    <Form layout="vertical">
                      <Form.Item label="Proyecto" required>
                        <Select
                          placeholder="Seleccionar proyecto"
                          options={proyectosMapaOptions}
                          value={proyectoMapa}
                          onChange={(value) => {
                            setProyectoMapa(value ?? null);
                            setArchivoSeleccionado(null);
                          }}
                          allowClear
                          showSearch
                          optionFilterProp="label"
                          notFoundContent={
                            proyectosDelMapa ? "Sin proyectos disponibles" : "Cargando..."
                          }
                        />
                      </Form.Item>
                    </Form>

                    <Upload
                      accept={FORMATOS_ADMITIDOS.join(",")}
                      showUploadList={false}
                      beforeUpload={seleccionarPlano}
                      disabled={!proyectoMapa}
                    >
                      <Button icon={<UploadOutlined />} disabled={!proyectoMapa}>
                        Seleccionar imagen
                      </Button>
                    </Upload>

                    <div style={{ color: "#8c8c8c", fontSize: 12, marginTop: 8 }}>
                      PNG, JPG o WEBP · máximo 10 MB
                    </div>

                    {archivoSeleccionado && (
                      <Alert
                        type="info"
                        showIcon
                        style={{ marginTop: 16 }}
                        message={archivoSeleccionado.file.name}
                        description={
                          <Space direction="vertical" size={8} style={{ width: "100%" }}>
                            <span>
                              {(archivoSeleccionado.file.size / 1024).toFixed(0)} KB · listo para
                              subir
                            </span>
                            <Space wrap>
                              <Button
                                type="primary"
                                icon={<UploadOutlined />}
                                loading={subiendoPlano}
                                onClick={handleSubirPlano}
                              >
                                Subir y guardar
                              </Button>
                              <Button
                                onClick={() => setArchivoSeleccionado(null)}
                                disabled={subiendoPlano}
                              >
                                Cancelar
                              </Button>
                            </Space>
                          </Space>
                        }
                      />
                    )}
                  </Col>

                  <Col xs={24} md={15}>
                    {!proyectoMapa ? (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          minHeight: 200,
                          borderRadius: 10,
                          border: "1px dashed #d9d9d9",
                          background: "#fafafa",
                          color: "#8c8c8c",
                        }}
                      >
                        <PictureOutlined style={{ fontSize: 28 }} />
                        <span>Seleccioná un proyecto para ver su plano</span>
                      </div>
                    ) : cargandoMapa ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                          minHeight: 200,
                        }}
                      >
                        <Spin />
                      </div>
                    ) : mapaProyecto?.url_publica ? (
                      <div>
                        <Image
                          src={mapaProyecto.url_publica}
                          alt="Plano del proyecto"
                          style={{
                            maxHeight: 320,
                            width: "100%",
                            objectFit: "contain",
                            borderRadius: 10,
                          }}
                        />
                        <div
                          style={{
                            marginTop: 12,
                            display: "flex",
                            justifyContent: "space-between",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <Tag color="green">Plano cargado</Tag>
                          <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            loading={quitandoPlano}
                            onClick={handleQuitarPlano}
                          >
                            Quitar plano
                          </Button>
                        </div>
                        <EnlacePublicoMapa
                          key={proyectoMapa}
                          proyectoId={proyectoMapa}
                          proyectoNombre={
                            proyectosDelMapa?.find((p) => p.id_proyecto === proyectoMapa)?.nombre ?? ""
                          }
                          mapa={mapaProyecto}
                        />
                      </div>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          minHeight: 200,
                          borderRadius: 10,
                          border: "1px dashed #d9d9d9",
                          background: "#fafafa",
                          color: "#8c8c8c",
                        }}
                      >
                        <PictureOutlined style={{ fontSize: 28 }} />
                        <span>Este proyecto todavía no tiene plano</span>
                      </div>
                    )}
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
  );
}
