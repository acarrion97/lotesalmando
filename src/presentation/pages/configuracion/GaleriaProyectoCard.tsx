import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Image,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import {
  DeleteOutlined,
  PictureOutlined,
  UploadOutlined,
  VideoCameraOutlined,
} from "@ant-design/icons";
import type { ProyectoMedio } from "@/domain/proyecto/entities";
import {
  FORMATOS_ADMITIDOS,
  validarArchivoMedio,
} from "@/application/proyectos/ports/ProyectoMedioStorage";
import { useMediosProyecto, useProyectos } from "@/presentation/hooks";

const { Text } = Typography;

const ACCEPT_IMAGEN_VIDEO = FORMATOS_ADMITIDOS.join(",");

/**
 * Galería del proyecto: fotos y videos que se publican en la pestaña
 * Galería del enlace público `/mapa/:slug`. Vive en Configuración,
 * debajo de la tarjeta del plano.
 */
export function GaleriaProyectoCard() {
  const [messageApi, contextHolder] = message.useMessage();
  const { data: proyectos, isLoading: cargandoProyectos } = useProyectos();
  const [proyecto, setProyecto] = useState<number | null>(null);
  const { medios, isLoading, subir, quitar } = useMediosProyecto(proyecto ?? 0);

  const opciones = useMemo(
    () => (proyectos ?? []).map((p) => ({ value: p.id_proyecto, label: p.nombre })),
    [proyectos],
  );

  const seleccionarArchivo = (file: File) => {
    const error = validarArchivoMedio(file);
    if (error) {
      messageApi.error(error);
      return Upload.LIST_IGNORE;
    }
    subir.mutate(file, {
      onSuccess: () => messageApi.success(`${file.name} subido a la galería`),
      onError: (err) =>
        messageApi.error(err instanceof Error ? err.message : "No se pudo subir el archivo"),
    });
    return Upload.LIST_IGNORE;
  };

  const borrar = (medio: ProyectoMedio) => {
    quitar.mutate(medio, {
      onSuccess: () => messageApi.success("Medio eliminado de la galería"),
      onError: (err) =>
        messageApi.error(err instanceof Error ? err.message : "No se pudo eliminar el medio"),
    });
  };

  const renderMedio = (medio: ProyectoMedio) => (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 10,
        overflow: "hidden",
        border: "1px solid #f0f0f0",
        background: "#000",
      }}
    >
      {medio.tipo === "imagen" ? (
        <Image
          src={medio.url}
          alt="Foto del proyecto"
          width="100%"
          height={130}
          style={{ objectFit: "cover", display: "block" }}
        />
      ) : (
        <video
          src={medio.url}
          controls
          preload="metadata"
          style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }}
        />
      )}
      <div
        style={{
          position: "absolute",
          top: 6,
          left: 6,
          display: "flex",
          gap: 4,
          pointerEvents: "none",
        }}
      >
        <Tag
          color={medio.tipo === "imagen" ? "blue" : "purple"}
          style={{ margin: 0, boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }}
          icon={medio.tipo === "imagen" ? <PictureOutlined /> : <VideoCameraOutlined />}
        >
          {medio.tipo === "imagen" ? "Foto" : "Video"}
        </Tag>
      </div>
      <Tooltip title="Quitar de la galería">
        <Button
          danger
          type="primary"
          size="small"
          aria-label="Quitar de la galería"
          icon={<DeleteOutlined />}
          loading={
            quitar.isPending && quitar.variables?.id_proyecto_medio === medio.id_proyecto_medio
          }
          style={{ position: "absolute", top: 6, right: 6 }}
          onClick={() => borrar(medio)}
        />
      </Tooltip>
    </div>
  );

  return (
    <Card
      title="Galería del proyecto"
      style={{ borderRadius: 12, marginTop: 16 }}
      extra={
        <span style={{ color: "#8c8c8c", fontSize: 12 }}>
          Fotos y videos que se ven en la pestaña Galería del enlace público
        </span>
      }
    >
      {contextHolder}
      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <div style={{ marginBottom: 12 }}>
            <Text strong>
              Proyecto <span style={{ color: "#ff4d4f" }}>*</span>
            </Text>
            <Select
              placeholder="Seleccionar proyecto"
              style={{ width: "100%", marginTop: 4 }}
              options={opciones}
              value={proyecto}
              onChange={(value) => setProyecto(value ?? null)}
              allowClear
              showSearch
              optionFilterProp="label"
              loading={cargandoProyectos}
              notFoundContent={proyectos ? "Sin proyectos disponibles" : "Cargando..."}
            />
          </div>

          <Upload
            accept={ACCEPT_IMAGEN_VIDEO}
            showUploadList={false}
            beforeUpload={seleccionarArchivo}
            disabled={!proyecto || subir.isPending}
          >
            <Button
              type="primary"
              icon={<UploadOutlined />}
              loading={subir.isPending}
              disabled={!proyecto}
            >
              Subir foto o video
            </Button>
          </Upload>

          <div style={{ color: "#8c8c8c", fontSize: 12, marginTop: 8 }}>
            Imágenes PNG, JPG o WEBP hasta 10 MB · Videos MP4 o WEBM hasta 50 MB
          </div>

          {subir.isPending && (
            <Alert type="info" showIcon style={{ marginTop: 12 }} message="Subiendo archivo..." />
          )}
        </Col>

        <Col xs={24} md={16}>
          {!proyecto ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 180,
                borderRadius: 10,
                border: "1px dashed #d9d9d9",
                background: "#fafafa",
                color: "#8c8c8c",
              }}
            >
              <PictureOutlined style={{ fontSize: 28 }} />
              <span>Seleccioná un proyecto para ver su galería</span>
            </div>
          ) : isLoading ? (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 180,
              }}
            >
              <Spin />
            </div>
          ) : !medios?.length ? (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                minHeight: 180,
                borderRadius: 10,
                border: "1px dashed #d9d9d9",
                background: "#fafafa",
                color: "#8c8c8c",
              }}
            >
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Todavía no hay fotos ni videos en este proyecto"
              />
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {medios.length} {medios.length === 1 ? "recurso" : "recursos"} · lo más nuevo
                  aparece primero
                </Text>
                <Space size={4}>
                  <Tag color="blue" icon={<PictureOutlined />} style={{ margin: 0 }}>
                    {medios.filter((m) => m.tipo === "imagen").length} fotos
                  </Tag>
                  <Tag color="purple" icon={<VideoCameraOutlined />} style={{ margin: 0 }}>
                    {medios.filter((m) => m.tipo === "video").length} videos
                  </Tag>
                </Space>
              </div>
              <Row gutter={[10, 10]}>
                {medios.map((medio) => (
                  <Col xs={12} sm={8} md={8} key={medio.id_proyecto_medio}>
                    {renderMedio(medio)}
                  </Col>
                ))}
              </Row>
            </>
          )}
        </Col>
      </Row>
    </Card>
  );
}
