import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Col, Form, Image, Row, Select, Space, Spin, Tag, Upload, message } from "antd";
import { useQueryClient } from "@tanstack/react-query";
import { DeleteOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import { useProyectos, useMapaByProyecto } from "@/presentation/hooks";
import { useEmpresa } from "@/presentation/providers";
import { getContainer } from "@/infrastructure/container";
import { EnlacePublicoMapa } from "./EnlacePublicoMapa";
import { UbicacionMapaForm } from "./UbicacionMapaForm";

const FORMATOS_ADMITIDOS = ["image/png", "image/jpeg", "image/webp"];
const TAMANO_MAXIMO_IMAGEN = 10 * 1024 * 1024; // 10 MB, igual que el bucket

interface MapaProyectoCardProps {
  /**
   * Proyecto a configurar. Si se pasa, la tarjeta trabaja directo sobre ese
   * proyecto y oculta el selector (uso desde el módulo Proyectos); sin él,
   * muestra el selector global (uso desde Configuración).
   */
  proyectoId?: number;
}

/**
 * Configuración del plano de un proyecto: imagen que se dibuja en la pestaña
 * Mapa del enlace público, más su galería de referencia y enlace público.
 */
export function MapaProyectoCard({ proyectoId }: MapaProyectoCardProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const { empresaActual } = useEmpresa();
  const container = getContainer();
  const queryClient = useQueryClient();

  const { data: proyectosDelMapa } = useProyectos();
  const [proyectoInterno, setProyectoInterno] = useState<number | null>(null);
  const proyecto: number | null = proyectoId ?? proyectoInterno;
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const [subiendoPlano, setSubiendoPlano] = useState(false);
  const [quitandoPlano, setQuitandoPlano] = useState(false);
  const { data: mapaProyecto, isLoading: cargandoMapa } = useMapaByProyecto(proyecto ?? 0);

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
    if (!empresaActual || !proyecto || !archivoSeleccionado) return;
    try {
      setSubiendoPlano(true);
      await container.subirImagenMapa.execute(proyecto, archivoSeleccionado.file);
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
    if (!empresaActual || !proyecto) return;
    try {
      setQuitandoPlano(true);
      await container.quitarImagenMapa.execute(proyecto);
      await queryClient.invalidateQueries({ queryKey: ["mapa", empresaActual.id_empresa] });
      setArchivoSeleccionado(null);
      messageApi.success("Plano eliminado");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo eliminar la imagen");
    } finally {
      setQuitandoPlano(false);
    }
  };

  return (
    <Card
      title="Mapa del proyecto"
      style={{ borderRadius: 12 }}
      extra={
        <span style={{ color: "#8c8c8c", fontSize: 12 }}>
          Plano de la pestaña Mapa del enlace público, donde se dibujan y abren los lotes
        </span>
      }
    >
      {contextHolder}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={9}>
          {proyectoId === undefined && (
            <Form layout="vertical">
              <Form.Item label="Proyecto" required>
                <Select
                  placeholder="Seleccionar proyecto"
                  options={proyectosMapaOptions}
                  value={proyectoInterno}
                  onChange={(value) => {
                    setProyectoInterno(value ?? null);
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
          )}

          <Upload
            accept={FORMATOS_ADMITIDOS.join(",")}
            showUploadList={false}
            beforeUpload={seleccionarPlano}
            disabled={!proyecto}
          >
            <Button icon={<UploadOutlined />} disabled={!proyecto}>
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
                    {(archivoSeleccionado.file.size / 1024).toFixed(0)} KB · listo para subir
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
                    <Button onClick={() => setArchivoSeleccionado(null)} disabled={subiendoPlano}>
                      Cancelar
                    </Button>
                  </Space>
                </Space>
              }
            />
          )}
        </Col>

        <Col xs={24} md={15}>
          {!proyecto ? (
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
              <span>
                {proyectoId === undefined
                  ? "Seleccioná un proyecto para ver su plano"
                  : "Este proyecto no tiene plano cargado"}
              </span>
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
                key={proyecto}
                proyectoId={proyecto}
                proyectoNombre={
                  proyectosDelMapa?.find((p) => p.id_proyecto === proyecto)?.nombre ?? ""
                }
                mapa={mapaProyecto}
              />
              <UbicacionMapaForm key={`ubic-${proyecto}`} proyectoId={proyecto} mapa={mapaProyecto} />
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
  );
}
