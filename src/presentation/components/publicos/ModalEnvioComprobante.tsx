import { useState } from "react";
import { Alert, Button, Form, InputNumber, Modal, Typography, Upload } from "antd";
import { InboxOutlined, SendOutlined } from "@ant-design/icons";
import { validarArchivoComprobante } from "@/application/comprobantes/ports/ComprobanteStorage";

const { Text } = Typography;

export interface EnvioComprobante {
  idCobranza: number;
  numeroCuota: number;
  montoCuota: number;
}

/**
 * Modal de envío del comprobante de pago: el cliente adjunta la imagen o
 * el PDF y declara cuánto pagó. No se toca el estado de la cuota: el
 * comprobante queda pendiente de revisión.
 */
export function ModalEnvioComprobante({
  open,
  cuota,
  onClose,
  onEnviar,
  enviando,
}: {
  open: boolean;
  cuota: EnvioComprobante | null;
  onClose: () => void;
  onEnviar: (datos: { idCobranza: number; montoPagado: number; file: File }) => void;
  enviando: boolean;
}) {
  const [monto, setMonto] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cerrar = () => {
    setMonto(null);
    setFile(null);
    setError(null);
    onClose();
  };

  const confirmar = () => {
    if (!cuota) return;
    if (!file) {
      setError("Adjuntá la foto o el PDF de tu comprobante");
      return;
    }
    const problema = validarArchivoComprobante(file);
    if (problema) {
      setError(problema);
      return;
    }
    if (!monto || monto <= 0) {
      setError("Escribí cuánto pagaste");
      return;
    }
    setError(null);
    onEnviar({ idCobranza: cuota.idCobranza, montoPagado: monto, file });
  };

  return (
    <Modal
      title={cuota ? `Comprobante de la cuota ${cuota.numeroCuota}` : "Comprobante de pago"}
      open={open}
      onCancel={cerrar}
      footer={
        <>
          <Button onClick={cerrar}>Cancelar</Button>
          <Button type="primary" icon={<SendOutlined />} loading={enviando} onClick={confirmar}>
            Enviar comprobante
          </Button>
        </>
      }
      destroyOnHidden
    >
      {cuota && (
        <>
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Valor de la cuota: ${cuota.montoCuota.toLocaleString()}`}
            description="Subí la foto o el PDF del comprobante y escribí el valor que pagaste. Lo revisamos y te confirmamos."
          />

          <Form layout="vertical">
            <Form.Item label="Valor que pagaste" required>
              <InputNumber
                style={{ width: "100%" }}
                min={0}
                step={0.01}
                placeholder="Por ejemplo: 1458.00"
                value={monto}
                onChange={(v) => setMonto(typeof v === "number" ? v : null)}
              />
            </Form.Item>

            <Form.Item label="Comprobante (imagen o PDF)" required>
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
                <p className="ant-upload-text">Hacé clic o arrastrá el comprobante acá</p>
                <p className="ant-upload-hint">PNG, JPG, WEBP o PDF. Hasta 10 MB.</p>
              </Upload.Dragger>
            </Form.Item>
          </Form>

          {error && (
            <Alert type="error" showIcon message={error} style={{ marginTop: 8 }} />
          )}

          <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 12 }}>
            Tu comprobante queda pendiente de revisión. Cuando lo aprobemos, la cuota va a figurar
            como pagada.
          </Text>
        </>
      )}
    </Modal>
  );
}
