import { useState } from "react";
import { Alert, Button, Descriptions, Modal, Space, Tag, Typography, Upload } from "antd";
import {
  DeleteOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  PaperClipOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import { useDocumentoContrato } from "@/presentation/hooks";

const { Text } = Typography;

/**
 * Documento de un contrato: si no tiene uno, se genera con los datos
 * existentes (Word o PDF); si tiene, se abre, se reemplaza o se quita.
 * También se puede anexar un archivo propio (PDF o Word) en vez de
 * generarlo.
 */
export function DocumentoContratoModal({
  contratoId,
  open,
  onClose,
}: {
  contratoId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const { contrato, generar, anexar, quitar, abrir } = useDocumentoContrato(contratoId);
  const [quitarAbierto, setQuitarAbierto] = useState(false);

  const documento = contrato.data;
  const tieneDocumento = !!documento?.documento_url;
  const ocupado = generar.isPending || anexar.isPending;

  return (
    <>
      <Modal
        title="Documento del contrato"
        open={open}
        onCancel={onClose}
        footer={
          <Button onClick={onClose}>Cerrar</Button>
        }
        width={560}
        destroyOnHidden
      >
        {contrato.isLoading ? (
          <Text type="secondary">Buscando el contrato...</Text>
        ) : !documento ? (
          <Alert
            type="error"
            showIcon
            message="No encontramos ese contrato"
            style={{ marginTop: 16 }}
          />
        ) : (
          <>
            <Descriptions bordered column={1} size="small" style={{ marginTop: 16 }}>
              <Descriptions.Item label="Contrato">
                <Tag color="blue">{documento.numero_contrato}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Documento">
                {tieneDocumento ? (
                  <Space direction="vertical" size={2}>
                    <Space>
                      {documento.documento_tipo === "pdf" ? (
                        <FilePdfOutlined style={{ color: "#cf1322" }} />
                      ) : (
                        <FileWordOutlined style={{ color: "#1677ff" }} />
                      )}
                      <Text strong>{documento.documento_nombre}</Text>
                      <Tag color={documento.documento_origen === "generado" ? "green" : "purple"}>
                        {documento.documento_origen === "generado" ? "Generado" : "Anexado"}
                      </Tag>
                    </Space>
                    {documento.documento_subido_en && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Guardado el {new Date(documento.documento_subido_en).toLocaleString()}
                      </Text>
                    )}
                  </Space>
                ) : (
                  <Text type="secondary">
                    Este contrato todavía no tiene documento. Generálo con los datos existentes o
                    anexá el tuyo.
                  </Text>
                )}
              </Descriptions.Item>
            </Descriptions>

            <Space direction="vertical" size={8} style={{ width: "100%", marginTop: 16 }}>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<FileWordOutlined />}
                  loading={generar.isPending && generar.variables === "docx"}
                  disabled={ocupado}
                  onClick={() => generar.mutate("docx")}
                >
                  Generar Word
                </Button>
                <Button
                  type="primary"
                  icon={<FilePdfOutlined />}
                  loading={generar.isPending && generar.variables === "pdf"}
                  disabled={ocupado}
                  onClick={() => generar.mutate("pdf")}
                >
                  Generar PDF
                </Button>
                <Upload
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  showUploadList={false}
                  beforeUpload={(file) => {
                    anexar.mutate(file);
                    return Upload.LIST_IGNORE;
                  }}
                >
                  <Button icon={<PaperClipOutlined />} loading={anexar.isPending} disabled={ocupado}>
                    Anexar archivo
                  </Button>
                </Upload>
              </Space>

              {tieneDocumento && (
                <Space wrap>
                  <Button icon={<DownloadOutlined />} onClick={() => abrir.mutate()} loading={abrir.isPending}>
                    Abrir documento
                  </Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => setQuitarAbierto(true)}
                    disabled={ocupado}
                  >
                    Quitar documento
                  </Button>
                </Space>
              )}

              <Text type="secondary" style={{ fontSize: 12 }}>
                <ThunderboltOutlined style={{ marginRight: 4 }} />
                El documento se arma con los datos que ya están cargados: contrato, venta, cotización,
                cliente, lote y plan de cuotas. Solo se aceptan PDF y Word (.docx), hasta 10 MB.
              </Text>
            </Space>
          </>
        )}
      </Modal>

      <Modal
        title="Quitar el documento"
        open={quitarAbierto}
        onCancel={() => setQuitarAbierto(false)}
        okText="Quitar"
        okButtonProps={{ danger: true }}
        onOk={() => {
          quitar.mutate(undefined, { onSuccess: () => setQuitarAbierto(false) });
        }}
      >
        <Text>
          Se va a borrar el documento de este contrato. El contrato queda sin documento y podés
          generar uno nuevo cuando quieras.
        </Text>
      </Modal>
    </>
  );
}
