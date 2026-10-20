import { useEffect, useState } from "react";
import { Alert, Button, Descriptions, Image, Input, Modal, Space, Spin, Typography } from "antd";
import { CheckOutlined, CloseOutlined, FilePdfOutlined } from "@ant-design/icons";
import type { Comprobante } from "@/domain/comprobante/entities";
import { useAbrirComprobante, useRevisionComprobante } from "@/presentation/hooks";
import { ComprobanteTag } from "./ComprobanteTag";
import { formatCurrency, formatDateOnly } from "@/utils";

const { Text, Paragraph } = Typography;

/**
 * Revisión del comprobante que subió el cliente: se ve el archivo, se
 * aprueba (queda registrado el pago y la cuota pasa a `pagada`) o se
 * rechaza con un motivo que el cliente lee en su portal.
 */
export function ModalRevisionComprobante({
  comprobante,
  open,
  onClose,
  contexto,
}: {
  comprobante: Comprobante | null;
  open: boolean;
  onClose: () => void;
  /** Dato extra para identificar la cuota (ej: "Contrato C-001 · Cuota 3"). */
  contexto?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [nota, setNota] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const abrir = useAbrirComprobante();
  const { aprobar, rechazar } = useRevisionComprobante();

  useEffect(() => {
    if (!open || !comprobante) {
      setUrl(null);
      setNota("");
      setRechazando(false);
      return;
    }
    let vigente = true;
    abrir.mutate(comprobante.id_comprobante, {
      onSuccess: (u) => {
        if (vigente) setUrl(u);
      },
    });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, comprobante?.id_comprobante]);

  const pendiente = comprobante?.estado === "pendiente";

  return (
    <>
      <Modal
        title="Comprobante de pago"
        open={open}
        onCancel={onClose}
        width={640}
        footer={
          pendiente ? (
            <Space>
              <Button danger icon={<CloseOutlined />} onClick={() => setRechazando(true)} loading={rechazar.isPending}>
                Rechazar
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={aprobar.isPending}
                onClick={() =>
                  aprobar.mutate(comprobante.id_comprobante, {
                    onSuccess: () => onClose(),
                  })
                }
              >
                Aprobar y registrar pago
              </Button>
            </Space>
          ) : (
            <Button onClick={onClose}>Cerrar</Button>
          )
        }
      >
        {comprobante && (
          <>
            <Descriptions bordered column={2} size="small">
              {contexto && (
                <Descriptions.Item label="Cuota" span={2}>
                  {contexto}
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Estado">
                <ComprobanteTag estado={comprobante.estado} />
              </Descriptions.Item>
              <Descriptions.Item label="Valor declarado">
                {formatCurrency(comprobante.monto_pagado)}
              </Descriptions.Item>
              <Descriptions.Item label="Cédula">{comprobante.cedula}</Descriptions.Item>
              <Descriptions.Item label="Enviado">
                {comprobante.creado_en ? formatDateOnly(comprobante.creado_en.slice(0, 10)) : "-"}
              </Descriptions.Item>
              <Descriptions.Item label="Archivo" span={2}>
                {comprobante.archivo_nombre ?? "comprobante"}
              </Descriptions.Item>
              {comprobante.estado === "rechazado" && comprobante.nota_rechazo && (
                <Descriptions.Item label="Motivo del rechazo" span={2}>
                  <Text type="danger">{comprobante.nota_rechazo}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              {abrir.isPending && <Spin />}
              {!abrir.isPending && !url && (
                <Alert type="error" showIcon message="No se pudo abrir el comprobante" />
              )}
              {url && comprobante.archivo_tipo === "pdf" && (
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
                    title="Comprobante"
                    src={url}
                    style={{ width: "100%", height: 360, border: "1px solid #f0f0f0", borderRadius: 8 }}
                  />
                </>
              )}
              {url && comprobante.archivo_tipo === "imagen" && (
                <Image
                  src={url}
                  alt="Comprobante de pago"
                  style={{ maxHeight: 360, objectFit: "contain" }}
                />
              )}
            </div>

            {pendiente && (
              <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
                Al aprobar se registra el pago con el valor declarado y la cuota pasa a «pagada».
              </Paragraph>
            )}
          </>
        )}
      </Modal>

      <Modal
        title="Rechazar el comprobante"
        open={rechazando}
        onCancel={() => setRechazando(false)}
        okText="Rechazar"
        okButtonProps={{ danger: true }}
        onOk={() => {
          if (!comprobante) return;
          rechazar.mutate(
            { id: comprobante.id_comprobante, nota: nota.trim() || null },
            { onSuccess: () => setRechazando(false) },
          );
        }}
      >
        <Paragraph>
          Escribí el motivo: el cliente lo va a ver en su portal y te va a servir para que envíe
          bien la prueba.
        </Paragraph>
        <Input.TextArea
          rows={3}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Por ejemplo: la foto no se lee, el monto no coincide con la cuota."
        />
      </Modal>
    </>
  );
}
