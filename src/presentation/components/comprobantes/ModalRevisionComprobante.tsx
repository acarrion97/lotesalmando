import { useEffect, useMemo, useState } from "react";
import { Alert, Button, Descriptions, Image, Input, Modal, Select, Space, Spin, Typography } from "antd";
import { CheckOutlined, CloseOutlined, FilePdfOutlined, FileTextOutlined } from "@ant-design/icons";
import type { Comprobante } from "@/domain/comprobante/entities";
import { useAbrirComprobante, useRevisionComprobante, useRecibosPorPagos, useDescargarRecibo, usePagos } from "@/presentation/hooks";
import type { Recibo } from "@/domain/recibo/entities";
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
  // La URL se guarda junto al id del comprobante: así, al cambiar de
  // comprobante no hace falta vaciar el estado dentro de un efecto (el
  // valor de otro comprobante queda viejo y se ignora solo).
  const [urlGuardada, setUrlGuardada] = useState<{ id: number; url: string } | null>(null);
  const [nota, setNota] = useState("");
  const [rechazando, setRechazando] = useState(false);
  const [formaPago, setFormaPago] = useState<import("@/domain/recibo/entities").FormaPago | undefined>();
  // Recibo que devuelve la aprobación recién hecha (queda en memoria para
  // poder bajarlo sin volver a consultar).
  const [reciboEmitido, setReciboEmitido] = useState<Recibo | null>(null);
  const abrir = useAbrirComprobante();
  const { aprobar, rechazar } = useRevisionComprobante();
  const descargarRecibo = useDescargarRecibo();

  const idComprobante = comprobante?.id_comprobante ?? null;
  const idCobranza = comprobante?.id_cobranza ?? null;

  // Para comprobantes ya aprobados: ubicar su pago y el recibo persistido.
  const { data: pagos } = usePagos();
  const idPagoDeLaCuota = useMemo(
    () => (pagos ?? []).find((p) => p.id_cobranza === idCobranza)?.id_pago,
    [pagos, idCobranza],
  );
  const { data: recibos } = useRecibosPorPagos(idPagoDeLaCuota !== undefined ? [idPagoDeLaCuota] : []);
  const reciboGuardado = useMemo(
    () => (recibos ?? []).find((r) => r.id_pago === idPagoDeLaCuota),
    [recibos, idPagoDeLaCuota],
  );

  // Manda el recibo recién emitido; si no, el persistido (ya aprobado).
  const reciboDescargable = reciboEmitido ?? (comprobante?.estado === "aprobado" ? reciboGuardado : null);

  useEffect(() => {
    if (!open || idComprobante === null) return;
    let vigente = true;
    abrir.mutate(idComprobante, {
      onSuccess: (u) => {
        if (vigente) setUrlGuardada({ id: idComprobante, url: u });
      },
    });
    return () => {
      vigente = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idComprobante]);

  const url = urlGuardada && urlGuardada.id === idComprobante ? urlGuardada.url : null;

  /** Cierra y deja todo limpio para la próxima apertura (en handlers). */
  const cerrar = () => {
    setUrlGuardada(null);
    setNota("");
    setRechazando(false);
    setReciboEmitido(null);
    onClose();
  };

  const pendiente = comprobante?.estado === "pendiente" && reciboEmitido === null;
  // Mientras no llegue la URL del comprobante que se está viendo se muestra
  // el spinner, así no aparece el aviso de error en el cambio de uno a otro.
  const cargando = idComprobante !== null && (abrir.isPending || urlGuardada?.id !== idComprobante);

  return (
    <>
      <Modal
        title="Comprobante de pago"
        open={open}
        onCancel={cerrar}
        width={640}
        footer={
          pendiente ? (
            <Space>
              <Button danger icon={<CloseOutlined />} onClick={() => setRechazando(true)} loading={rechazar.isPending}>
                Rechazar
              </Button>
              <Select
                placeholder="Forma de pago"
                value={formaPago}
                onChange={setFormaPago}
                style={{ width: 170 }}
                options={[
                  { value: "efectivo", label: "Efectivo" },
                  { value: "transferencia", label: "Transferencia" },
                  { value: "deposito", label: "Depósito" },
                  { value: "tarjeta", label: "Tarjeta" },
                  { value: "cheque", label: "Cheque" },
                  { value: "otro", label: "Otro" },
                ]}
              />
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={aprobar.isPending}
                disabled={!formaPago}
                onClick={() =>
                  formaPago && aprobar.mutate({ id: comprobante.id_comprobante, formaPago }, {
                    onSuccess: (resultado) => {
                      // El recibo sale de la misma confirmación: se queda a
                      // mano para poder bajarlo sin salir del modal.
                      setReciboEmitido(resultado.recibo ?? null);
                    },
                  })
                }
              >
                Aprobar y registrar pago
              </Button>
            </Space>
          ) : (
            <Space>
              {reciboDescargable && (
                <Button
                  icon={<FileTextOutlined />}
                  loading={descargarRecibo.isPending}
                  onClick={() => descargarRecibo.mutate(reciboDescargable.id_pago)}
                >
                  Descargar recibo
                </Button>
              )}
              <Button onClick={cerrar}>Cerrar</Button>
            </Space>
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
              {cargando && <Spin />}
              {!cargando && !url && (
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

            {reciboEmitido && (
              <Alert
                type="success"
                showIcon
                style={{ marginTop: 12 }}
                message={`Pago registrado · Recibo ${reciboEmitido.numero_recibo}`}
                description="El recibo quedó guardado: se puede descargar las veces que haga falta desde el pago o desde acá."
              />
            )}

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
