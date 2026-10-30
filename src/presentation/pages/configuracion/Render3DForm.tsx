import { lazy, Suspense, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Image, Space, Tag, Typography, Upload, message } from "antd";
import { DeleteOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import type { Mapa } from "@/domain/mapa/entities";
import { getContainer } from "@/infrastructure/container";
import { esModelo3D } from "@/presentation/components/maps/modelo3d";

const { Text } = Typography;
const VisorModelo3D = lazy(() =>
  import("@/presentation/components/maps/VisorModelo3D").then((m) => ({
    default: m.VisorModelo3D,
  })),
);

/**
 * El render puede ser una imagen (capa Render del Visor3D) o un modelo 3D
 * navegable abierto con three.js (VisorModelo3D). El filtro por `file.type`
 * no basta: muchos navegadores no le asignan tipo a `.obj` o `.stl`, así que
 * también se valida la extensión del nombre.
 */
const FORMATOS_ADMITIDOS = [
  // Imágenes (capa Render del Visor3D)
  "image/png",
  "image/jpeg",
  "image/webp",
  // Modelos 3D (VisorModelo3D). `application/octet-stream` es lo habitual
  // en .obj/.stl exportados de SketchUp/Blender sin tipo asignado.
  "model/obj",
  "model/gltf+json",
  "model/gltf-binary",
  "model/stl",
  "application/octet-stream",
  // Algunos sistemas identifican los archivos .obj como imágenes TGIF.
  "application/x-tgif",
];
/** Extensiones admitidas, para el filtro por nombre y para el `accept`. */
const EXTENSIONES_ADMITIDAS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".obj",
  ".glb",
  ".gltf",
  ".stl",
  ".fbx",
  ".dae",
];
/** Extensiones de modelo 3D (el resto son imágenes). */
const EXTENSIONES_MODELO = [".obj", ".glb", ".gltf", ".stl", ".fbx", ".dae"];
const TAMANO_MAXIMO_IMAGEN = 10 * 1024 * 1024; // 10 MB, igual que siempre
/** Los modelos pesan más que una imagen: 50 MB (el bucket se amplía en la 035). */
const TAMANO_MAXIMO_MODELO = 50 * 1024 * 1024;

/** ¿El archivo es un modelo 3D (por extensión o por tipo MIME)? */
function esModelo(file: File): boolean {
  return EXTENSIONES_MODELO.some((ext) => file.name.toLowerCase().endsWith(ext));
}

/** Validación compartida por el botón y el `beforeUpload` del Upload. */
function validarArchivo(file: File): string | null {
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  const extensionOk = EXTENSIONES_ADMITIDAS.includes(extension);
  const modelo = EXTENSIONES_MODELO.includes(extension);
  const mimeOk = modelo || !file.type || file.type.startsWith("image/");
  if (!extensionOk || !mimeOk) {
    return "Formato no admitido: usá una imagen (PNG, JPG, WEBP) o un modelo 3D (.obj, .glb, .gltf, .stl, .fbx, .dae)";
  }
  const limite = modelo ? TAMANO_MAXIMO_MODELO : TAMANO_MAXIMO_IMAGEN;
  if (file.size > limite) {
    return `El archivo supera los ${Math.round(limite / (1024 * 1024))} MB`;
  }
  return null;
}

/** Lista para el `accept` del Upload: tipos MIME + extensiones. */
const ACEPTAR = [...FORMATOS_ADMITIDOS, ...EXTENSIONES_ADMITIDAS].join(",");

interface Render3DFormProps {
  proyectoId: number;
  mapa: Mapa;
}

/**
 * Render 3D del proyecto: una imagen (PNG/JPG/WEBP) o un modelo 3D navegable
 * (.obj, .glb, .gltf, .stl, .fbx, .dae). El visitante lo ve en la pestaña
 * "Render 3D" del mapa público: si es imagen se apoya en el plano inclinado
 * (capa "Render" del Visor3D); si es modelo, three.js lo muestra navegable
 * (VisorModelo3D, girar/acercar con el mouse). Se sube al mismo bucket que
 * el plano, pero en su propia subcarpeta, así que reemplazarlo o quitarlo
 * nunca toca el plano ni la galería.
 */
export function Render3DForm({ proyectoId, mapa }: Render3DFormProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const renderUrl = mapa.render_3d_url ?? null;
  /** Archivo elegido (con preview solo si es imagen: un modelo no se previsualiza en un <img>). */
  const [pendiente, setPendiente] = useState<{ file: File; preview: string | null } | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [quitando, setQuitando] = useState(false);

  // Libera el object URL de la previsualización al cambiarlo o al desmontar.
  useEffect(() => {
    return () => {
      if (pendiente?.preview) URL.revokeObjectURL(pendiente.preview);
    };
  }, [pendiente]);

  const seleccionar = (file: File) => {
    const problema = validarArchivo(file);
    if (problema) {
      messageApi.error(problema);
      return Upload.LIST_IGNORE;
    }
    setPendiente({
      file,
      preview: esModelo(file) ? null : URL.createObjectURL(file),
    });
    return Upload.LIST_IGNORE;
  };

  const subir = async () => {
    if (!pendiente) return;
    try {
      setSubiendo(true);
      await getContainer().subirRender3D.execute(proyectoId, pendiente.file);
      await queryClient.invalidateQueries({ queryKey: ["mapa"] });
      setPendiente(null);
      messageApi.success("Render 3D actualizado: ya aparece en la pestaña Render 3D");
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
        Imagen (aire, fachada o perspectiva) o modelo 3D del emprendimiento. El visitante lo ve en
        la pestaña «Render 3D» del mapa: las imágenes se apoyan en el plano inclinado y se pueden
        girar y acercar; los modelos se abren navegables (girar y acercar con el mouse).
      </Text>

      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space wrap align="center" size={12}>
          <Upload
            accept={ACEPTAR}
            showUploadList={false}
            beforeUpload={seleccionar}
            disabled={subiendo || quitando}
          >
            <Button icon={<UploadOutlined />} loading={subiendo} disabled={quitando}>
              {renderUrl ? "Reemplazar render" : "Subir render 3D"}
            </Button>
          </Upload>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Imagen PNG/JPG/WEBP (máx. 10 MB) o modelo 3D .obj/.glb/.gltf/.stl/.fbx/.dae (máx. 50 MB)
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
              {pendiente.preview ? (
                <Image
                  src={pendiente.preview}
                  alt="Previsualización del render 3D"
                  style={{ maxHeight: 200, borderRadius: 8, objectFit: "contain" }}
                />
              ) : (
                <Text type="secondary">
                  Modelo 3D: <Text strong>{pendiente.file.name}</Text> — se verá navegable en la
                  pestaña Render 3D del mapa (sin previsualización acá).
                </Text>
              )}
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

        {!pendiente &&
          renderUrl &&
          (esModelo3D(renderUrl) ? (
            <Suspense fallback={<Text type="secondary">Cargando vista previa del modelo…</Text>}>
              <VisorModelo3D modeloUrl={renderUrl} alturaMaxima={240} />
            </Suspense>
          ) : (
            <Image
              src={renderUrl}
              alt="Render 3D del proyecto"
              style={{ maxHeight: 200, borderRadius: 8, objectFit: "contain" }}
            />
          ))}
      </Space>
    </div>
  );
}
