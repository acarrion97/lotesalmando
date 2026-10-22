import { useEffect, useState } from "react";
import { DeleteOutlined, PictureOutlined, UploadOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Card, Image, Popconfirm, Space, Spin, Tag, Upload, message } from "antd";
import { getContainer } from "@/infrastructure/container";
import { inventoryKeys } from "@/presentation/hooks/inventoryKeys";
import { useLogoByEmpresa } from "@/presentation/hooks";
import { useEmpresa } from "@/presentation/providers/EmpresaProvider";

const FORMATOS_ADMITIDOS = ["image/png", "image/jpeg", "image/webp"];
const TAMANO_MAXIMO_IMAGEN = 10 * 1024 * 1024;

export function LogoEmpresaPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const { empresaActual } = useEmpresa();
  const empresaId = empresaActual?.id_empresa ?? 0;
  const { data: logoEmpresa, isLoading: cargandoLogo } = useLogoByEmpresa(empresaId);
  const queryClient = useQueryClient();
  const container = getContainer();
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<{
    file: File;
    preview: string;
  } | null>(null);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [quitandoLogo, setQuitandoLogo] = useState(false);

  useEffect(() => {
    return () => {
      if (archivoSeleccionado) URL.revokeObjectURL(archivoSeleccionado.preview);
    };
  }, [archivoSeleccionado]);

  const seleccionarLogo = (file: File) => {
    if (!FORMATOS_ADMITIDOS.includes(file.type)) {
      messageApi.error("Formato no admitido: use PNG, JPG o WEBP");
      return Upload.LIST_IGNORE;
    }
    if (file.size > TAMANO_MAXIMO_IMAGEN) {
      messageApi.error("La imagen supera los 10 MB");
      return Upload.LIST_IGNORE;
    }

    setArchivoSeleccionado({ file, preview: URL.createObjectURL(file) });
    return Upload.LIST_IGNORE;
  };

  const refrescarLogo = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: inventoryKeys.logoEmpresa(empresaId) }),
      queryClient.invalidateQueries({ queryKey: inventoryKeys.configuracion(empresaId) }),
    ]);
  };

  const handleSubirLogo = async () => {
    if (!empresaId || !archivoSeleccionado) return;

    setSubiendoLogo(true);
    try {
      await container.subirLogo.execute(empresaId, archivoSeleccionado.file);
      await refrescarLogo();
      setArchivoSeleccionado(null);
      messageApi.success("Logo de la empresa actualizado");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo subir el logo");
    } finally {
      setSubiendoLogo(false);
    }
  };

  const handleQuitarLogo = async () => {
    if (!empresaId) return;

    setQuitandoLogo(true);
    try {
      await container.quitarLogo.execute(empresaId);
      await refrescarLogo();
      setArchivoSeleccionado(null);
      messageApi.success("Logo eliminado");
    } catch (error) {
      messageApi.error(error instanceof Error ? error.message : "No se pudo eliminar el logo");
    } finally {
      setQuitandoLogo(false);
    }
  };

  return (
    <Card
      title="Logo de la empresa"
      style={{ borderRadius: 12 }}
      extra={
        <span style={{ color: "#8c8c8c", fontSize: 12 }}>
          Se guarda en la configuración de la empresa
        </span>
      }
    >
      {contextHolder}
      {!empresaActual ? (
        <Alert
          type="info"
          showIcon
          message="No hay una empresa seleccionada"
          description="Selecciona una empresa para administrar su logo."
        />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) minmax(0, 2fr)", gap: 24 }}>
          <div>
            <Upload
              accept={FORMATOS_ADMITIDOS.join(",")}
              showUploadList={false}
              beforeUpload={seleccionarLogo}
              disabled={subiendoLogo || quitandoLogo}
            >
              <Button icon={<UploadOutlined />}>Seleccionar imagen</Button>
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
                  <Space direction="vertical" size={8}>
                    <span>{(archivoSeleccionado.file.size / 1024).toFixed(0)} KB · listo para subir</span>
                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<UploadOutlined />}
                        loading={subiendoLogo}
                        onClick={handleSubirLogo}
                      >
                        Subir y guardar
                      </Button>
                      <Button
                        onClick={() => setArchivoSeleccionado(null)}
                        disabled={subiendoLogo}
                      >
                        Cancelar
                      </Button>
                    </Space>
                  </Space>
                }
              />
            )}
          </div>

          <div
            style={{
              minHeight: 220,
              padding: 16,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              border: "1px dashed #d9d9d9",
              borderRadius: 10,
              background: "#fafafa",
            }}
          >
            {cargandoLogo ? (
              <Spin />
            ) : archivoSeleccionado ? (
              <Image
                src={archivoSeleccionado.preview}
                alt="Vista previa del logo"
                style={{ maxHeight: 240, maxWidth: "100%", objectFit: "contain" }}
                preview={false}
              />
            ) : logoEmpresa ? (
              <>
                <Image
                  src={logoEmpresa}
                  alt={`Logo de ${empresaActual.razon_social}`}
                  style={{ maxHeight: 240, maxWidth: "100%", objectFit: "contain" }}
                />
                <Space>
                  <Tag color="green">Logo cargado</Tag>
                  <Popconfirm
                    title="Quitar el logo de la empresa"
                    description="Esta acción eliminará el logo guardado."
                    onConfirm={handleQuitarLogo}
                    okText="Quitar"
                    cancelText="Cancelar"
                  >
                    <Button
                      danger
                      size="small"
                      icon={<DeleteOutlined />}
                      loading={quitandoLogo}
                    >
                      Quitar logo
                    </Button>
                  </Popconfirm>
                </Space>
              </>
            ) : (
              <>
                <PictureOutlined style={{ fontSize: 32, color: "#8c8c8c" }} />
                <span style={{ color: "#8c8c8c" }}>La empresa aún no tiene logo</span>
              </>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
