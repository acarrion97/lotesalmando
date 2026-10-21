import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Image, Space, Tag, Typography, Upload, message } from "antd";
import { DeleteOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import type { Mapa } from "@/domain/mapa/entities";
import { getContainer } from "@/infrastructure/container";

const { Text } = Typography;

const FORMATOS_ADMITIDOS = ["image/png", "image/jpeg", "image/webp"];
const TAMANO_MAXIMO = 10 * 1024 * 1024; // 10 MB, igual que el bucket

interface Render3DFormProps {
  proyectoId: number;
  mapa: Mapa;
}

/**
 * Render 3D del proyecto: una imagen (PNG/JPG/WEBP) que el visitante ve como
 * capa "Render" dentro de la Vista 3D del mapa, como guía visual del
 * emprendimiento mientras gira y acerca la escena. Se sube al mismo bucket
 * que el plano, pero en su propia subcarpeta, así que reemplazarlo o
 * quitarlo nunca toca el plano ni la galería.
 */
export function Render3DForm({ proyectoId, mapa }: Render3DFormProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const renderUrl = mapa.render_3d_url ?? null;
  const [pendiente, setPendiente] = useState<{ file: File; preview: string } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [quitando, setQuitando] = useState(false);

  // Libera el object URL de la previsualización al cambiarlo o al desmontar.
  useEffect(() => {
    return () => {
      if (pendiente) URL.revokeObjectURL(pendiente.preview);
    };
  }, [pendiente]);

  const seleccionar = (file: File) => {
    if (!FORMATOS_ADMITIDOS.includes(file.type)) {
      messageApi.error("Formato no admitido: usá PNG, JPG o WEBP");
      return Upload.LIST_IGNORE;
    }
    if (file.size > TAMANO_MAXIMO) {
      messageApi.error("La imagen supera los 10 MB");
      return Upload.LIST_IGNORE;
    }
    setPendiente({ file, preview: URL.createObjectURL(file) });
    return Upload.LIST_IGNORE;
  };

  const subir = async () => {
    if (!pendiente) return;
    try {
      setSubiendo(true);
      await getContainer().subirRender3D.execute(proyectoId, pendiente.file);
      await queryClient.invalidateQueries({ queryKey: ["mapa"] });
      setPendiente(null);
      messageApi.success("Render 3D actualizado: ya aparece en la Vista 3D");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo subir el render");
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = async () => {
    try {
      setQuitando(true);
      await getContainer().quitarRender3D.execute(proyectoId);
      await queryClient.invalidateQueries({ queryKey: ["mapa"] });
      messageApi.success("Render 3D eliminado");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo quitar el render");
    } finally {
      setQuitando(false);
    }
  };

  return (
    <div
      style={{
        marginTop: 16,
        padding: 12,
        borderRadius: 10,
        background: "#fafafa",
        border: "1px solid #f0f0f0",
      }}
    >
      {contextHolder}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <PictureOutlined />
        <Text strong>Render 3D del proyecto</Text>
        {renderUrl ? <Tag color="geekblue">Render cargado</Tag> : <Tag>Sin render</Tag>}
      </div>
      <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 10 }}>
        Imagen del emprendimiento (aire, fachada o perspectiva) que el visitante usa como guía
        dentro de la Vista 3D: aparece como capa “Render” y se puede girar y acercar igual que el
        plano.
      </Text>

      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space wrap align="center" size={12}>
          <Upload
            accept={FORMATOS_ADMITIDOS.join(",")}
            showUploadList={false}
            beforeUpload={seleccionar}
            disabled={subiendo || quitando}
          >
            <Button icon={<UploadOutlined />} loading={subiendo} disabled={quitando}>
              {renderUrl ? "Reemplazar render" : "Subir render 3D"}
            </Button>
          </Upload>
          <Text type="secondary" style={{ fontSize: 12 }}>
            PNG, JPG o WEBP · máximo 10 MB
          </Text>
          {renderUrl && (
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              loading={quitando}
              onClick={quitar}
            >
              Quitar render
            </Button>
          )}
        </Space>

        {pendiente && (
          <div
            style={{
              padding: 10,
              borderRadius: 8,
              background: "#fff",
              border: "1px solid #d9d9d9",
            }}
          >
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Image
                src={pendiente.preview}
                alt="Previsualización del render 3D"
                style={{ maxHeight: 200, borderRadius: 8, objectFit: "contain" }}
              />
              <Space wrap>
                <Button type="primary" icon={<UploadOutlined />} loading={subiendo} onClick={subir}>
                  Subir y guardar
                </Button>
                <Button onClick={() => setPendiente(null)} disabled={subiendo}>
                  Cancelar
                </Button>
              </Space>
            </Space>
          </div>
        )}

        {!pendiente && renderUrl && (
          <Image
            src={renderUrl}
            alt="Render 3D del proyecto"
            style={{ maxHeight: 200, borderRadius: 8, objectFit: "contain" }}
          />
        )}
      </Space>
    </div>
  );
}
