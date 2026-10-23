import { useState } from "react";
import { Alert, Button, Form, Modal, Typography, Upload } from "antd";
import { InboxOutlined, SendOutlined } from "@ant-design/icons";
import { validarArchivoDocumento } from "@/application/portalProspecto/ports/PortalProspectoStorage";
import type { DocumentoProspectoTipo } from "@/domain/portalProspecto/entities";

const { Text } = Typography;

export interface EnvioDocumentoProspecto {
  tipo: DocumentoProspectoTipo;
  nombre: string;
}

/**
 * Modal de envío de un documento de la checklist: el prospecto adjunta
 * la imagen o el PDF. El documento queda `pendiente` hasta que el asesor
 * lo revise (un reenvío pisa el anterior).
 */
export function UploadDocumentoProspecto({
  open,
  documento,
  onClose,
  onEnviar,
  enviando,
}: {
  open: boolean;
  documento: EnvioDocumentoProspecto | null;
  onClose: () => void;
  onEnviar: (datos: { file: File }) => void;
  enviando: boolean;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cerrar = () => {
    setFile(null);
    setError(null);
    onClose();
  };

  const confirmar = () => {
    if (!documento) return;
    if (!file) {
      setError("Adjuntá la imagen o el PDF del documento");
      return;
    }
    const problema = validarArchivoDocumento(file);
    if (problema) {
      setError(problema);
      return;
    }
    setError(null);
    onEnviar({ file });
  };

  return (
    <Modal
      title={documento ? documento.nombre : "Enviar documento"}
      open={open}
      onCancel={cerrar}
      footer={
        <>
          <Button onClick={cerrar}>Cancelar</Button>
          <Button type="primary" icon={<SendOutlined />} loading={enviando} onClick={confirmar}>
            Enviar documento
          </Button>
        </>
      }
      destroyOnHidden
    >
      {documento && (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Documento: ${documento.nombre}`}
            description="Subí la imagen o el PDF. Lo revisamos y te avisamos por el portal."
          />

          <Form layout="vertical">
            <Form.Item label="Archivo (imagen o PDF)" required>
              <Upload.Dragger
                accept="image/png,image/jpeg,image/webp,application/pdf"
                maxCount={1}
                beforeUpload={(f) => {
                  setFile(f);
                  setError(null);
                  return Upload.LIST_IGNORE;
                }}
                onRemove={() => {
                  setFile(null);
                  return true;
                }}
                fileList={file ? [{ uid: "1", name: file.name, status: "done" }] : []}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Hacé clic o arrastrá el archivo acá</p>
                <p className="ant-upload-hint">PNG, JPG, WEBP o PDF. Hasta 10 MB.</p>
              </Upload.Dragger>
            </Form.Item>
          </Form>

          {error && (
            <Alert type="error" showIcon message={error} style={{ marginTop: 8 }} />
          )}

          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 12 }}>
            El documento queda pendiente de revisión. Si algo no está bien, te pedimos corregirlo
            acá mismo.
          </Text>
        </>
      )}
    </Modal>
  );
}
