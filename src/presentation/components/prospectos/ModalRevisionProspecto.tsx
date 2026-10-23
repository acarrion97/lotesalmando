import { useEffect, useState } from "react";
import { Alert, Button, Descriptions, Image, Input, Modal, Space, Spin, Tag, Typography } from "antd";
import { CheckOutlined, CloseOutlined, FilePdfOutlined } from "@ant-design/icons";
import type { DocumentoProspecto } from "@/domain/portalProspecto/entities";
import { DOCUMENTOS_REQUERIDOS } from "@/domain/portalProspecto/entities";
import {
  useAbrirDocumentoProspecto,
  useRevisionDocumentoProspecto,
} from "@/presentation/hooks";
import { formatDateOnly } from "@/utils";

const { Text, Paragraph } = Typography;

const ESTADO: Record<string, { color: string; label: string }> = {
  pendiente: { color: "blue", label: "En revisión" },
  aprobado: { color: "green", label: "Aprobado" },
  rechazado: { color: "red", label: "Rechazado" },
};

function esPdf(documento: DocumentoProspecto): boolean {
  const nombre = (documento.archivo_nombre ?? documento.archivo_path).toLowerCase();
  return nombre.endsWith(".pdf");
}

/**
 * Revisión del documento que subió el prospecto desde el portal: se ve
 * el archivo, se aprueba o se rechaza con una observación obligatoria
 * (el prospecto la lee en su checklist para reenviar corregido).
 */
export function ModalRevisionProspecto({
  documento,
  open,
  onClose,
}: {
  documento: DocumentoProspecto | null;
  open: boolean;
  onClose: () => void;
}) {
  // La URL se guarda junto al id: al cambiar de documento no queda una
  // URL vieja mostrándose (mismo criterio que ModalRevisionComprobante).
  const [urlGuardada, setUrlGuardada] = useState<{ id: number; url: string } | null>(null);
  const [nota, setNota] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const abrir = useAbrirDocumentoProspecto();
  const { aprobar, rechazar } = useRevisionDocumentoProspecto();

  const idDocumento = documento?.id_documento ?? null;

  useEffect(() => {
    if (!open || idDocumento === null) return;
    let vigente = true;
    abrir.mutate(idDocumento, {
      onSuccess: (u) => {
        if (vigente) setUrlGuardada({ id: idDocumento, url: u });
      },
      onError: () => {
        if (vigente) setUrlGuardada(null);
      },
    });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idDocumento]);

  const url = urlGuardada && urlGuardada.id === idDocumento ? urlGuardada.url : null;
  const pendiente = documento?.estado === "pendiente";
  const cargando = idDocumento !== null && (abrir.isPending || urlGuardada?.id !== idDocumento);

  const nombreTipo = documento
    ? (DOCUMENTOS_REQUERIDOS.find((d) => d.tipo === documento.tipo)?.nombre ?? documento.tipo)
    : "";

  const cerrar = () => {
    setUrlGuardada(null);
    setNota("");
    setRechazando(false);
    onClose();
  };

  return (
    <>
      <Modal
        title="Documento del prospecto"
        open={open}
        onCancel={cerrar}
        width={640}
        footer={
          pendiente && !rechazando ? (
            <Space>
              <Button
                danger
                icon={<CloseOutlined />}
                loading={rechazar.isPending}
                onClick={() => setRechazando(true)}
              >
                Rechazar
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={aprobar.isPending}
                onClick={() => documento && aprobar.mutate({ id: documento.id_documento })}
              >
                Aprobar
              </Button>
            </Space>
          ) : (
            <Button onClick={cerrar}>Cerrar</Button>
          )
        }
        destroyOnHidden
      >
        {documento && (
          <>
            <Descriptions bordered column={2} size="small">
              <Descriptions.Item label="Prospecto">
                {documento.prospecto?.nombres ?? `#${documento.id_prospecto}`}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {documento.prospecto?.email ?? "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Documento">{nombreTipo}</Descriptions.Item>
              <Descriptions.Item label="Estado">
                <Tag color={ESTADO[documento.estado]?.color ?? "default"}>
                  {ESTADO[documento.estado]?.label ?? documento.estado}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Enviado">
                {documento.creado_en
                  ? formatDateOnly(documento.creado_en.slice(0, 10))
                  : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Archivo">
                {documento.archivo_nombre ?? "documento"}
              </Descriptions.Item>
              {documento.estado === "rechazado" && documento.nota_revision && (
                <Descriptions.Item label="Observación" span={2}>
                  <Text type="danger">{documento.nota_revision}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              {cargando && <Spin />}
              {!cargando && !url && (
                <Alert type="error" showIcon message="No se pudo abrir el documento" />
              )}
              {url && esPdf(documento) && (
                <>
                  <Space style={{ marginBottom: 8 }}>
                    <FilePdfOutlined style={{ color: "#cf1322" }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Vista previa del PDF (podés abrirlo en otra pestaña)
                    </Text>
                    <Button size="small" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
                      Abrir
                    </Button>
                  </Space>
                  <iframe
                    title="Documento del prospecto"
                    src={url}
                    style={{ width: "100%", height: 360, border: "1px solid #f0f0f0", borderRadius: 8 }}
                  />
                </>
              )}
              {url && !esPdf(documento) && (
                <Image
                  src={url}
                  alt="Documento del prospecto"
                  style={{ maxHeight: 360, objectFit: "contain" }}
                />
              )}
            </div>

            {pendiente && !rechazando && (
              <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                Al aprobar, el prospecto ve «Aprobado» en su portal. Al rechazar, escribí la
                observación para que sepa qué corregir.
              </Paragraph>
            )}
          </>
        )}
      </Modal>

      <Modal
        title="Rechazar el documento"
        open={rechazando}
        onCancel={() => setRechazando(false)}
        okText="Rechazar"
        onOk={() => {
          if (!documento) return;
          rechazar.mutate(
            { id: documento.id_documento, nota: nota.trim() || null },
            {
              onSuccess: () => {
                setRechazando(false);
                setNota("");
                onClose();
              },
            },
          );
        }}
        confirmLoading={rechazar.isPending}
        okButtonProps={{ danger: true, disabled: !nota.trim() }}
      >
        <Paragraph type="secondary">
          Escribí qué debe corregir el prospecto. Es obligatoria: la verá en su checklist.
        </Paragraph>
        <Input.TextArea
          rows={3}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej: La imagen de la cédula está borrosa, volvé a subirla."
        />
      </Modal>
    </>
  );
}
